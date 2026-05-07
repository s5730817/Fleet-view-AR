const DB_NAME = "transitlens-offline";
const DB_VERSION = 2;

const CACHE_STORE = "api-cache";
const QUEUE_STORE = "operation-queue";
const META_STORE = "meta";

export type OfflineOperationKind =
  | "createFault"
  | "updateFaultStatus"
  | "addFaultUpdate"
  | "addMaintenanceEntry";

export type OfflineOperationStatus = "pending" | "needs_manager_review" | "resolved";

export interface OfflineOperation {
  id: string;
  kind: OfflineOperationKind;
  createdAt: number;
  status: OfflineOperationStatus;
  busId?: string | null;
  busName?: string | null;
  summary: string;
  payload: Record<string, unknown>;
  lastError?: string | null;
  resolutionNote?: string | null;
}

interface CacheRecord<T> {
  key: string;
  value: T;
  updatedAt: number;
}

interface MetaRecord<T> {
  key: string;
  value: T;
}

const buildOperationSummary = (kind: OfflineOperationKind, payload: Record<string, unknown>) => {
  if (kind === "createFault") {
    const request = payload.request as { title?: string } | undefined;
    return request?.title ? `Offline issue: ${request.title}` : "Offline issue creation";
  }

  if (kind === "addMaintenanceEntry") {
    const entry = payload.entry as { description?: string; type?: string } | undefined;
    return entry?.description || `Offline ${entry?.type || "maintenance"} log`;
  }

  if (kind === "updateFaultStatus") {
    const body = payload.body as { status?: string } | undefined;
    return body?.status ? `Offline status update to ${body.status}` : "Offline status update";
  }

  if (kind === "addFaultUpdate") {
    const update = payload.update as { description?: string } | undefined;
    return update?.description || "Offline issue comment";
  }

  return "Offline change";
};

const buildBusContext = (payload: Record<string, unknown>) => {
  const offlineContext = payload.offlineContext as { busId?: string; busName?: string } | null | undefined;

  return {
    busId: (payload.busId as string | undefined) || offlineContext?.busId || null,
    busName: (payload.busName as string | undefined) || offlineContext?.busName || null,
  };
};

const normalizeOfflineOperation = (operation: OfflineOperation & { status?: string }) => ({
  ...operation,
  status: operation.status === "failed"
    ? "needs_manager_review"
    : (operation.status as OfflineOperationStatus) || "pending",
  summary: operation.summary || buildOperationSummary(operation.kind, operation.payload || {}),
  ...buildBusContext(operation.payload || {}),
});

let openPromise: Promise<IDBDatabase> | null = null;

const openDatabase = () => {
  if (openPromise) {
    return openPromise;
  }

  openPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }

      const queueStore = database.objectStoreNames.contains(QUEUE_STORE)
        ? request.transaction?.objectStore(QUEUE_STORE)
        : database.createObjectStore(QUEUE_STORE, { keyPath: "id" });

      if (queueStore && !queueStore.indexNames.contains("createdAt")) {
        queueStore.createIndex("createdAt", "createdAt");
      }

      if (queueStore && !queueStore.indexNames.contains("status")) {
        queueStore.createIndex("status", "status");
      }

      if (queueStore && !queueStore.indexNames.contains("busId")) {
        queueStore.createIndex("busId", "busId");
      }

      if (request.transaction && request.transaction.db.version >= 2) {
        const cursorRequest = queueStore?.openCursor();

        if (cursorRequest) {
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;

            if (!cursor) {
              return;
            }

            const value = cursor.value as OfflineOperation & { status?: string };
            const nextValue: OfflineOperation = normalizeOfflineOperation(value);

            cursor.update(nextValue);
            cursor.continue();
          };
        }
      }

      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open offline database"));
  });

  return openPromise;
};

const withStore = async <T>(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => void | Promise<T>) => {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    Promise.resolve(callback(store))
      .then((value) => {
        transaction.oncomplete = () => resolve(value as T);
        transaction.onerror = () => reject(transaction.error || new Error(`Offline store transaction failed for ${storeName}`));
      })
      .catch(reject);
  });
};

export const setCachedValue = async <T>(key: string, value: T) => {
  await withStore<void>(CACHE_STORE, "readwrite", (store) => {
    store.put({ key, value, updatedAt: Date.now() } satisfies CacheRecord<T>);
  });
};

export const getCachedValue = async <T>(key: string) => {
  return withStore<T | null>(CACHE_STORE, "readonly", (store) =>
    new Promise<T | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as CacheRecord<T> | undefined)?.value ?? null);
      request.onerror = () => reject(request.error || new Error(`Failed to read offline cache for ${key}`));
    })
  );
};

export const putOfflineOperation = async (operation: OfflineOperation) => {
  await withStore<void>(QUEUE_STORE, "readwrite", (store) => {
    store.put(normalizeOfflineOperation(operation));
  });
};

export const deleteOfflineOperation = async (id: string) => {
  await withStore<void>(QUEUE_STORE, "readwrite", (store) => {
    store.delete(id);
  });
};

export const listOfflineOperations = async () => {
  return withStore<OfflineOperation[]>(QUEUE_STORE, "readonly", (store) =>
    new Promise<OfflineOperation[]>((resolve, reject) => {
      const request = store.index("createdAt").getAll();
      request.onsuccess = () => resolve(((request.result as Array<OfflineOperation & { status?: string }>) || []).map(normalizeOfflineOperation));
      request.onerror = () => reject(request.error || new Error("Failed to list queued offline operations"));
    })
  );
};

export const countOfflineOperations = async () => {
  return withStore<number>(QUEUE_STORE, "readonly", (store) =>
    new Promise<number>((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error || new Error("Failed to count offline operations"));
    })
  );
};

export const updateOfflineOperation = async (id: string, updates: Partial<OfflineOperation>) => {
  await withStore<void>(QUEUE_STORE, "readwrite", (store) =>
    new Promise<void>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const existingOperation = request.result as OfflineOperation | undefined;

        if (!existingOperation) {
          resolve();
          return;
        }

        store.put(normalizeOfflineOperation({
          ...existingOperation,
          ...updates,
        } as OfflineOperation & { status?: string }));
        resolve();
      };
      request.onerror = () => reject(request.error || new Error(`Failed to update offline operation ${id}`));
    })
  );
};

export const setOfflineMeta = async <T>(key: string, value: T) => {
  await withStore<void>(META_STORE, "readwrite", (store) => {
    store.put({ key, value } satisfies MetaRecord<T>);
  });
};

export const getOfflineMeta = async <T>(key: string) => {
  return withStore<T | null>(META_STORE, "readonly", (store) =>
    new Promise<T | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as MetaRecord<T> | undefined)?.value ?? null);
      request.onerror = () => reject(request.error || new Error(`Failed to read offline meta for ${key}`));
    })
  );
};