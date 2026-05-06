import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { listOfflineOperations, updateOfflineOperation, type OfflineOperation } from "@/lib/offline-store";
import { OFFLINE_QUEUE_CHANGED_EVENT, OFFLINE_SYNC_EVENT, hasValidOfflineSession } from "@/lib/offline";
import { getOfflineWorkingSetStatus, primeOfflineSessionCaches, syncPendingOperations } from "@/lib/api";

const USER_CHANGED_EVENT = "transitlens:user-changed";
const LAST_SYNC_KEY = "transitlens:last-sync-at";

interface SyncStatusContextType {
  isOnline: boolean;
  pendingCount: number;
  reviewCount: number;
  syncInProgress: boolean;
  bootstrapInProgress: boolean;
  offlineReady: boolean;
  offlineMissingResources: string[];
  hasOfflineAccess: boolean;
  operations: OfflineOperation[];
  getBusOperationState: (busId?: string | null) => { pending: number; review: number };
  retryOperation: (operationId: string) => Promise<void>;
  resolveOperation: (operationId: string, note?: string) => Promise<void>;
  prepareOfflineNow: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SyncStatusContext = createContext<SyncStatusContextType>({
  isOnline: true,
  pendingCount: 0,
  reviewCount: 0,
  syncInProgress: false,
  bootstrapInProgress: false,
  offlineReady: false,
  offlineMissingResources: [],
  hasOfflineAccess: false,
  operations: [],
  getBusOperationState: () => ({ pending: 0, review: 0 }),
  retryOperation: async () => {},
  resolveOperation: async () => {},
  prepareOfflineNow: async () => {},
  syncNow: async () => {},
});

export const SyncStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [bootstrapInProgress, setBootstrapInProgress] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [offlineMissingResources, setOfflineMissingResources] = useState<string[]>([]);
  const [hasOfflineAccess, setHasOfflineAccess] = useState(hasValidOfflineSession());
  const [operations, setOperations] = useState<OfflineOperation[]>([]);

  const refreshOfflineState = useCallback(async () => {
    try {
      const nextOperations = (await listOfflineOperations()).filter((operation) => operation.status !== "resolved");
      setOperations(nextOperations);
      setPendingCount(nextOperations.filter((operation) => operation.status === "pending").length);
      setReviewCount(nextOperations.filter((operation) => operation.status === "needs_manager_review").length);
    } catch {
      setOperations([]);
      setPendingCount(0);
      setReviewCount(0);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!window.navigator.onLine) {
      return;
    }

    setSyncInProgress(true);

    try {
      const result = await syncPendingOperations();
      if (result.synced > 0) {
        window.localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      }
    } finally {
      setSyncInProgress(false);
      setHasOfflineAccess(hasValidOfflineSession());
      void refreshOfflineState();
    }
  }, [refreshOfflineState]);

  const primeOfflineWorkingSet = useCallback(async () => {
    if (!window.navigator.onLine) {
      const status = await getOfflineWorkingSetStatus().catch(() => null);
      setOfflineReady(Boolean(status?.ready));
      setOfflineMissingResources(status?.missing || []);
      return;
    }

    const token = window.localStorage.getItem("token");

    if (!token) {
      setOfflineReady(false);
      setOfflineMissingResources([]);
      return;
    }

    setBootstrapInProgress(true);

    try {
      await primeOfflineSessionCaches();
      const status = await getOfflineWorkingSetStatus().catch(() => null);
      setOfflineReady(Boolean(status?.ready));
      setOfflineMissingResources(status?.missing || []);
    } catch {
      const status = await getOfflineWorkingSetStatus().catch(() => null);
      setOfflineReady(Boolean(status?.ready));
      setOfflineMissingResources(status?.missing || []);
    } finally {
      setBootstrapInProgress(false);
    }
  }, []);

  const retryOperation = useCallback(async (operationId: string) => {
    await updateOfflineOperation(operationId, {
      status: "pending",
      lastError: null,
      resolutionNote: null,
    });
    await refreshOfflineState();
    await syncNow();
  }, [refreshOfflineState, syncNow]);

  const resolveOperation = useCallback(async (operationId: string, note?: string) => {
    await updateOfflineOperation(operationId, {
      status: "resolved",
      resolutionNote: note || "Reviewed and resolved by manager",
    });
    await refreshOfflineState();
  }, [refreshOfflineState]);

  const getBusOperationState = useCallback((busId?: string | null) => {
    if (!busId) {
      return { pending: 0, review: 0 };
    }

    const relevantOperations = operations.filter((operation) => operation.busId === busId);

    return {
      pending: relevantOperations.filter((operation) => operation.status === "pending").length,
      review: relevantOperations.filter((operation) => operation.status === "needs_manager_review").length,
    };
  }, [operations]);

  useEffect(() => {
    void refreshOfflineState();

    const handleOnline = () => {
      setIsOnline(true);
      setHasOfflineAccess(hasValidOfflineSession());
      void primeOfflineWorkingSet();
      void syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setHasOfflineAccess(hasValidOfflineSession());
    };

    const handleQueueChange = () => {
      void refreshOfflineState();
    };

    const handleUserChanged = () => {
      setHasOfflineAccess(hasValidOfflineSession());
      void refreshOfflineState();
      if (window.navigator.onLine) {
        void primeOfflineWorkingSet();
        void syncNow();
      }
    };

    void primeOfflineWorkingSet();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChange);
    window.addEventListener(OFFLINE_SYNC_EVENT, handleQueueChange);
    window.addEventListener(USER_CHANGED_EVENT, handleUserChanged);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChange);
      window.removeEventListener(OFFLINE_SYNC_EVENT, handleQueueChange);
      window.removeEventListener(USER_CHANGED_EVENT, handleUserChanged);
    };
  }, [primeOfflineWorkingSet, refreshOfflineState, syncNow]);

  useEffect(() => {
    if (!isOnline || pendingCount === 0 || syncInProgress) {
      return;
    }

    void syncNow();

    const retryTimer = window.setInterval(() => {
      if (!window.navigator.onLine) {
        return;
      }

      void syncNow();
    }, 15000);

    return () => {
      window.clearInterval(retryTimer);
    };
  }, [isOnline, pendingCount, syncInProgress, syncNow]);

  return (
    <SyncStatusContext.Provider
      value={{
        isOnline,
        pendingCount,
        reviewCount,
        syncInProgress,
        bootstrapInProgress,
        offlineReady,
        offlineMissingResources,
        hasOfflineAccess,
        operations,
        getBusOperationState,
        retryOperation,
        resolveOperation,
        prepareOfflineNow: primeOfflineWorkingSet,
        syncNow,
      }}
    >
      {children}
    </SyncStatusContext.Provider>
  );
};

export const useSyncStatus = () => useContext(SyncStatusContext);