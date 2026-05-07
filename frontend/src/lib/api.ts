import {
  buildUserScopedCacheKey,
  createLocalId,
  dispatchOfflineQueueChanged,
  dispatchOfflineSyncEvent,
  getStoredToken,
  getStoredUser,
  isOfflineCapableRole,
} from "@/lib/offline";
import {
  deleteOfflineOperation,
  getCachedValue,
  getOfflineMeta,
  listOfflineOperations,
  putOfflineOperation,
  setCachedValue,
  setOfflineMeta,
  updateOfflineOperation,
  type OfflineOperation,
} from "@/lib/offline-store";
import {
  composeBusARContext,
} from "@/lib/ar-context-cache";
import {
  applyOptimisticARContextOperations,
  applyOptimisticBusOperations,
  applyOptimisticFleetOperations,
} from "@/lib/offline-optimistic";
import { maintenanceEntryRequiresManagerApproval } from "@/lib/offline-review";
import type { ARCatalog, Bus, BusARContext, BusARSnapshot, MaintenanceEntry } from "@/types/fleet";

type MaintenanceEntryWrite = {
  type: "service" | "repair" | "replacement";
  description: string;
  user_id: string;
  notes?: string;
  resolved_issue_ids?: string[];
  requires_manager_approval?: boolean;
};

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  `/api`;

const LOCAL_ISSUE_ID_MAP_KEY = "local-issue-id-map";
const getOfflineWorkingSetKey = () => buildUserScopedCacheKey("offline-working-set");

type OfflineWorkingSetStatus = {
  ready: boolean;
  updatedAt: string | null;
  resources: {
    fleet: boolean;
    jobs: boolean;
    summary: boolean;
    arCatalog: boolean;
    busDetails: boolean;
    arSnapshots: boolean;
  };
  missing: string[];
};

const createOperationSummary = (kind: OfflineOperation["kind"], payload: Record<string, unknown>) => {
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

const extractBusContext = (payload: Record<string, unknown>) => {
  const offlineContext = payload.offlineContext as { busId?: string; busName?: string } | null | undefined;

  return {
    busId: (payload.busId as string | undefined) || offlineContext?.busId || null,
    busName: (payload.busName as string | undefined) || offlineContext?.busName || null,
  };
};

// Shared headers for protected API requests
const getAuthHeaders = () => {
  const token = getStoredToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const isNetworkError = (error: unknown) => error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError");

const getOfflineRole = () => getStoredUser().role;

const assertOfflineWriteAllowed = () => {
  if (window.navigator.onLine) {
    return;
  }

  if (!isOfflineCapableRole(getOfflineRole())) {
    throw new Error("Offline, can not proceed");
  }
};

const readCachedResponse = async <T>(cacheKey: string) => {
  const cached = await getCachedValue<T>(cacheKey);
  if (cached) {
    return cached;
  }

  throw new Error("Offline, can not proceed");
};

const fetchJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    throw new Error(json?.error || json?.message || `Request failed (${response.status})`);
  }

  return json.data;
};

const fetchWithOfflineCache = async <T>(cacheKey: string, url: string, init?: RequestInit) => {
  try {
    const data = await fetchJson(url, init);
    await setCachedValue(cacheKey, data);
    return data as T;
  } catch (error) {
    if (!window.navigator.onLine || isNetworkError(error)) {
      return readCachedResponse<T>(cacheKey);
    }

    throw error;
  }
};

const enqueueOfflineOperation = async (operation: OfflineOperation) => {
  await putOfflineOperation(operation);
  dispatchOfflineQueueChanged();

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    if (registration && "sync" in registration) {
      await registration.sync.register("sync-maintenance-logs").catch(() => null);
    }
  }
};

const getLocalIssueIdMap = async () => (await getOfflineMeta<Record<string, string>>(LOCAL_ISSUE_ID_MAP_KEY)) || {};

const setLocalIssueIdMap = async (value: Record<string, string>) => {
  await setOfflineMeta(LOCAL_ISSUE_ID_MAP_KEY, value);
};

const resolveIssueIdForSync = async (issueId: string) => {
  const localIssueIdMap = await getLocalIssueIdMap();
  return localIssueIdMap[issueId] || issueId;
};

const markOperationForManagerReview = async (operation: OfflineOperation, reason: string) => {
  await updateOfflineOperation(operation.id, {
    status: "needs_manager_review",
    lastError: reason,
    ...extractBusContext(operation.payload),
  });
};

const getPendingOfflineOperations = async () => listOfflineOperations();

const readARContextFromOfflineCaches = async (busId: string) => {
  const [snapshot, catalog] = await Promise.all([
    getCachedValue<BusARSnapshot>(buildUserScopedCacheKey("bus-ar-snapshot", busId)),
    getCachedValue<ARCatalog>(buildUserScopedCacheKey("ar-catalog")),
  ]);

  if (!snapshot || !catalog) {
    throw new Error("Offline, can not proceed");
  }

  return composeBusARContext(snapshot, catalog);
};

export const getOfflineWorkingSetStatus = async () => {
  return getOfflineMeta<OfflineWorkingSetStatus>(getOfflineWorkingSetKey());
};

const canWarmOfflineCaches = () =>
  window.navigator.onLine && Boolean(getStoredToken()) && isOfflineCapableRole(getOfflineRole());

const cacheOnlineResponse = async <T>(cacheKey: string, url: string, init?: RequestInit) => {
  const data = await fetchJson(url, init);
  await setCachedValue(cacheKey, data);
  return data as T;
};

const toSucceeded = <T>(result: PromiseSettledResult<T>) => result.status === "fulfilled";

const cacheOnlineResponseWithRetry = async <T>(cacheKey: string, url: string, init?: RequestInit, retries = 1) => {
  try {
    return await cacheOnlineResponse<T>(cacheKey, url, init);
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }

    return cacheOnlineResponseWithRetry<T>(cacheKey, url, init, retries - 1);
  }
};

const warmSharedOfflineCaches = async () => {
  if (!canWarmOfflineCaches()) {
    return {
      jobs: false,
      summary: false,
      arCatalog: false,
    };
  }

  const [jobsResult, summaryResult, arCatalogResult] = await Promise.allSettled([
    cacheOnlineResponseWithRetry(buildUserScopedCacheKey("jobs"), `${API_URL}/jobs`, {
      headers: getAuthHeaders(),
    }),
    cacheOnlineResponseWithRetry(buildUserScopedCacheKey("summary"), `${API_URL}/summary`, {
      headers: getAuthHeaders(),
    }),
    cacheOnlineResponseWithRetry(buildUserScopedCacheKey("ar-catalog"), `${API_URL}/fleet/ar-catalog`, {
      headers: getAuthHeaders(),
    }),
  ]);

  return {
    jobs: toSucceeded(jobsResult),
    summary: toSucceeded(summaryResult),
    arCatalog: toSucceeded(arCatalogResult),
  };
};

const warmBusScopedOfflineCaches = async (fleet: Bus[]) => {
  if (!canWarmOfflineCaches() || fleet.length === 0) {
    return {
      busDetails: false,
      arSnapshots: false,
      arContexts: false,
    };
  }

  const busDetailResults = await Promise.allSettled(
    fleet.map((bus) =>
      cacheOnlineResponseWithRetry(buildUserScopedCacheKey("bus", bus.id), `${API_URL}/fleet/${bus.id}`, {
        headers: getAuthHeaders(),
      })
    )
  );

  const arSnapshotResults = await Promise.allSettled(
    fleet.map((bus) =>
      cacheOnlineResponseWithRetry(buildUserScopedCacheKey("bus-ar-snapshot", bus.id), `${API_URL}/fleet/${bus.id}/ar-snapshot`, {
        headers: getAuthHeaders(),
      })
    )
  );

  const arContextResults = await Promise.allSettled(
    fleet.map((bus) =>
      cacheOnlineResponseWithRetry(buildUserScopedCacheKey("bus-ar-context", bus.id), `${API_URL}/fleet/${bus.id}/ar-context`, {
        headers: getAuthHeaders(),
      })
    )
  );

  return {
    busDetails: busDetailResults.every(toSucceeded),
    arSnapshots: arSnapshotResults.every(toSucceeded),
    arContexts: arContextResults.every(toSucceeded),
  };
};

const readBusFromFleetCache = async (id: string) => {
  const fleet = await getCachedValue<Bus[]>(buildUserScopedCacheKey("fleet"));
  const cachedBus = fleet?.find((entry) => entry.id === id) || null;

  if (!cachedBus) {
    throw new Error("Offline, can not proceed");
  }

  return cachedBus;
};

export const primeOfflineSessionCaches = async () => {
  if (!canWarmOfflineCaches()) {
    return;
  }

  await setOfflineMeta(getOfflineWorkingSetKey(), {
    ready: false,
    updatedAt: null,
    resources: {
      fleet: false,
      jobs: false,
      summary: false,
      arCatalog: false,
      busDetails: false,
      arSnapshots: false,
      arContexts: false,
    },
    missing: ["fleet", "jobs", "summary", "arCatalog", "busDetails", "arSnapshots", "arContexts"],
  });

  const fleet = await cacheOnlineResponse<Bus[]>(buildUserScopedCacheKey("fleet"), `${API_URL}/fleet`, {
    headers: getAuthHeaders(),
  }).catch(() => null);

  const sharedStatus = await warmSharedOfflineCaches();

  const busScopedStatus = fleet
    ? await warmBusScopedOfflineCaches(fleet)
    : { busDetails: false, arSnapshots: false, arContexts: false };

  const resources = {
    fleet: Boolean(fleet),
    jobs: sharedStatus.jobs,
    summary: sharedStatus.summary,
    arCatalog: sharedStatus.arCatalog,
    busDetails: busScopedStatus.busDetails,
    arSnapshots: busScopedStatus.arSnapshots,
    arContexts: busScopedStatus.arContexts,
  };

  const missing = Object.entries(resources)
    .filter(([, isReady]) => !isReady)
    .map(([key]) => key);

  await setOfflineMeta(getOfflineWorkingSetKey(), {
    ready: missing.length === 0,
    updatedAt: new Date().toISOString(),
    resources,
    missing,
  });
};

export const getFleet = async (): Promise<Bus[]> => {
  const fleet = await fetchWithOfflineCache<Bus[]>(buildUserScopedCacheKey("fleet"), `${API_URL}/fleet`, {
    headers: getAuthHeaders(),
  });

  if (canWarmOfflineCaches()) {
    void warmSharedOfflineCaches();
    void warmBusScopedOfflineCaches(fleet);
  }

  return applyOptimisticFleetOperations(fleet, await getPendingOfflineOperations());
};

export const getBusById = async (id: string): Promise<Bus> => {
  let bus: Bus;

  try {
    bus = await fetchWithOfflineCache<Bus>(buildUserScopedCacheKey("bus", id), `${API_URL}/fleet/${id}`, {
      headers: getAuthHeaders(),
    });
  } catch (error) {
    if (!window.navigator.onLine || isNetworkError(error)) {
      bus = await readBusFromFleetCache(id);
    } else {
      throw error;
    }
  }

  return applyOptimisticBusOperations(bus, await getPendingOfflineOperations());
};

export const getBusARContext = async (id: string): Promise<BusARContext> => {
  try {
    const arContext = await fetchWithOfflineCache<BusARContext>(buildUserScopedCacheKey("bus-ar-context", id), `${API_URL}/fleet/${id}/ar-context`, {
      headers: getAuthHeaders(),
    });

    return applyOptimisticARContextOperations(arContext, await getPendingOfflineOperations());
  } catch (error) {
    if (!window.navigator.onLine || isNetworkError(error)) {
      return applyOptimisticARContextOperations(await readARContextFromOfflineCaches(id), await getPendingOfflineOperations());
    }

    throw error;
  }
};

export const addMaintenanceEntry = async (
  busId: string,
  componentId: string,
  entry: MaintenanceEntryWrite,
  offlineContext?: { busName?: string }
): Promise<MaintenanceEntry | { id: string; offlinePending: true }> => {
  if (!window.navigator.onLine) {
    assertOfflineWriteAllowed();
    const payload = { busId, componentId, entry, offlineContext };
    await enqueueOfflineOperation({
      id: createLocalId("offline-op"),
      kind: "addMaintenanceEntry",
      createdAt: Date.now(),
      status: "pending",
      busId,
      busName: offlineContext?.busName || null,
      summary: createOperationSummary("addMaintenanceEntry", payload),
      payload,
    });

    return {
      id: createLocalId("offline-maintenance"),
      offlinePending: true,
    };
  }

  return fetchJson(`${API_URL}/fleet/${busId}/components/${componentId}/history`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(entry),
  });
};

export const loginUser = async (username: string, password: string) => {
  if (!window.navigator.onLine) {
    throw new Error("Offline, can not proceed");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      // Send both keys to avoid backend field-name mismatches.
      body: JSON.stringify({ username, email: username, password }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      throw new Error(
        json?.error ||
          json?.message ||
          `Login request failed (${res.status})`
      );
    }

    return json.data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Login request timed out while calling ${API_URL}/auth/login`);
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach API at ${API_URL}. Make sure backend is running and CORS is configured.`
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const getJobs = async () => {
  return fetchWithOfflineCache(buildUserScopedCacheKey("jobs"), `${API_URL}/jobs`, {
    headers: getAuthHeaders(),
  });
};

export const getCachedJobsSnapshot = async () => {
  return (await getCachedValue<Array<{
    id: string;
    busId: string;
    busName: string;
    componentId: string;
    componentName: string;
    title: string;
    status: string;
    urgency: string;
    assignedTo: string;
    assignedToName: string | null;
    dueDate: string;
    createdAt: string;
  }>>(buildUserScopedCacheKey("jobs"))) || [];
};

export const getCachedFleetSnapshot = async () => {
  return (await getCachedValue<Bus[]>(buildUserScopedCacheKey("fleet"))) || [];
};

export type SummaryPeriod = "week" | "month" | "3months" | "6months" | "year";

export type SummaryData = {
  period: SummaryPeriod;
  periodLabel: string;

  summaryStats: {
    created: number;
    completed: number;
    completionRate: string;
    overdue: number;
  };

  createdCompletedData: {
    date: string;
    created: number;
    completed: number;
  }[];

  fleetConditionData: {
    name: string;
    value: number;
  }[];

  onTimeOverdueData: {
    name: string;
    value: number;
  }[];

  jobsByStatusData: {
    status: string;
    value: number;
  }[];
};

export const getSummary = async (
  period: SummaryPeriod = "week"
): Promise<SummaryData> => {
  const res = await fetch(`${API_URL}/summary?period=${period}`, {
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to fetch summary");
  }

  return json.data;
};

// Verify 2FA code
export const verify2FA = async (email: string, code: string) => {
  if (!window.navigator.onLine) {
    throw new Error("Offline, can not proceed");
  }

  const res = await fetch(`${API_URL}/auth/verify-2fa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, code }),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "2FA verification failed");
  }

  return json.data;
};

export const createFault = async ({
  title,
  description,
  priority,
  bus_part_id,
  issue_type_id,
  assigned_user_id,
  source,
  initial_note,
  offline_context,
}: {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  bus_part_id?: string;
  issue_type_id?: string;
  assigned_user_id?: string;
  source?: string;
  initial_note?: string;
  offline_context?: { busId?: string; busName?: string };
}): Promise<{ id: string; offlinePending?: boolean }> => {
  const payload = {
    title,
    description,
    priority,
    bus_part_id,
    issue_type_id,
    assigned_user_id,
    source,
  };

  if (!window.navigator.onLine) {
    assertOfflineWriteAllowed();
    const localIssueId = createLocalId("offline-issue");
    await enqueueOfflineOperation({
      id: createLocalId("offline-op"),
      kind: "createFault",
      createdAt: Date.now(),
      status: "pending",
      busId: offline_context?.busId || null,
      busName: offline_context?.busName || null,
      summary: createOperationSummary("createFault", { request: payload }),
      payload: {
        localIssueId,
        request: payload,
        initialNote: initial_note || null,
        offlineContext: offline_context || null,
      },
    });

    return {
      id: localIssueId,
      offlinePending: true,
    };
  }

  const createdIssue = await fetchJson(`${API_URL}/faults`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (initial_note?.trim()) {
    await addFaultUpdate(createdIssue.id, {
      update_type: "comment",
      description: initial_note.trim(),
    });
  }

  return createdIssue;
};

export const updateFaultStatus = async (
  issueId: string,
  body: {
    status: "reported" | "in_progress" | "awaiting_approval" | "resolved";
  },
  offlineContext?: { busId?: string; busName?: string }
): Promise<{ id: string; offlinePending?: boolean; status?: string }> => {
  if (!window.navigator.onLine) {
    assertOfflineWriteAllowed();
    const payload = { issueId, body, offlineContext };
    await enqueueOfflineOperation({
      id: createLocalId("offline-op"),
      kind: "updateFaultStatus",
      createdAt: Date.now(),
      status: "pending",
      busId: offlineContext?.busId || null,
      busName: offlineContext?.busName || null,
      summary: createOperationSummary("updateFaultStatus", payload),
      payload,
    });

    return {
      id: issueId,
      offlinePending: true,
      ...body,
    };
  }

  return fetchJson(`${API_URL}/faults/${issueId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
};

export const addFaultUpdate = async (
  issueId: string,
  update: {
    update_type: "comment" | "status_change" | "sign_off";
    description: string;
    status_from?: string | null;
    status_to?: string | null;
  },
  offlineContext?: { busId?: string; busName?: string }
): Promise<{ id: string; offlinePending?: boolean }> => {
  if (!window.navigator.onLine) {
    assertOfflineWriteAllowed();

    if (update.update_type !== "comment") {
      throw new Error("Offline, can not proceed");
    }

    const payload = { issueId, update, offlineContext };
    await enqueueOfflineOperation({
      id: createLocalId("offline-op"),
      kind: "addFaultUpdate",
      createdAt: Date.now(),
      status: "pending",
      busId: offlineContext?.busId || null,
      busName: offlineContext?.busName || null,
      summary: createOperationSummary("addFaultUpdate", payload),
      payload,
    });

    return {
      id: createLocalId("offline-update"),
      offlinePending: true,
    };
  }

  return fetchJson(`${API_URL}/faults/${issueId}/updates`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(update),
  });
};

export const syncPendingOperations = async () => {
  if (!window.navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const operations = await listOfflineOperations();
  let synced = 0;
  let failed = 0;
  const localIssueIdMap = await getLocalIssueIdMap();

  for (const operation of operations) {
    if (operation.status !== "pending") {
      continue;
    }

    try {
      if (operation.kind === "createFault") {
        const request = operation.payload.request as Record<string, unknown>;
        const createdIssue = await fetchJson(`${API_URL}/faults`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(request),
        });

        const localIssueId = operation.payload.localIssueId as string;
        localIssueIdMap[localIssueId] = createdIssue.id;
        await setLocalIssueIdMap(localIssueIdMap);

        const initialNote = operation.payload.initialNote as string | null;
        if (initialNote) {
          await fetchJson(`${API_URL}/faults/${createdIssue.id}/updates`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              update_type: "comment",
              description: initialNote,
            }),
          });
        }
      }

      if (operation.kind === "addFaultUpdate") {
        const issueId = await resolveIssueIdForSync(operation.payload.issueId as string);
        if (issueId.startsWith("offline-issue:")) {
          await markOperationForManagerReview(operation, "Waiting for the referenced offline issue to be reviewed or synced first");
          failed += 1;
          dispatchOfflineQueueChanged();
          continue;
        }
        await fetchJson(`${API_URL}/faults/${issueId}/updates`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(operation.payload.update),
        });
      }

      if (operation.kind === "updateFaultStatus") {
        const issueId = await resolveIssueIdForSync(operation.payload.issueId as string);
        if (issueId.startsWith("offline-issue:")) {
          await markOperationForManagerReview(operation, "Waiting for the referenced offline issue to be reviewed or synced first");
          failed += 1;
          dispatchOfflineQueueChanged();
          continue;
        }
        await fetchJson(`${API_URL}/faults/${issueId}/status`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(operation.payload.body),
        });
      }

      if (operation.kind === "addMaintenanceEntry") {
        const entry = {
          ...(operation.payload.entry as MaintenanceEntryWrite),
        };

        if (Array.isArray(entry.resolved_issue_ids) && entry.resolved_issue_ids.length > 0) {
          const resolvedIssueIds = await Promise.all(entry.resolved_issue_ids.map((issueId) => resolveIssueIdForSync(issueId)));

          if (resolvedIssueIds.some((issueId) => issueId.startsWith("offline-issue:"))) {
            await markOperationForManagerReview(operation, "Waiting for the referenced offline issue to be reviewed or synced first");
            failed += 1;
            dispatchOfflineQueueChanged();
            continue;
          }

          entry.resolved_issue_ids = resolvedIssueIds;
        }

        if (maintenanceEntryRequiresManagerApproval(entry)) {
          entry.requires_manager_approval = true;
        }

        await fetchJson(
          `${API_URL}/fleet/${operation.payload.busId}/components/${operation.payload.componentId}/history`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(entry),
          }
        );
      }

      await deleteOfflineOperation(operation.id);
      synced += 1;
      dispatchOfflineQueueChanged();
    } catch (error) {
      failed += 1;

      if (isNetworkError(error)) {
        break;
      }

      await markOperationForManagerReview(
        operation,
        error instanceof Error ? error.message : "Sync failed and requires manager review"
      );
      dispatchOfflineQueueChanged();
      continue;
    }
  }

  dispatchOfflineSyncEvent({ synced, failed });
  return { synced, failed };
};