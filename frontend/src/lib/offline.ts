export const OFFLINE_QUEUE_CHANGED_EVENT = "transitlens:offline-queue-changed";
export const OFFLINE_SYNC_EVENT = "transitlens:offline-sync";
export const OFFLINE_SESSION_KEY = "transitlens:offline-session";
export const OFFLINE_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type OfflineSessionRecord = {
  userId: string;
  role: string;
  createdAt: number;
  expiresAt: number;
};

export const normalizeRole = (role: unknown) => {
  if (typeof role !== "string") {
    return "engineer";
  }

  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === "admin" || normalizedRole === "manager") {
    return normalizedRole;
  }

  if (normalizedRole === "engineer" || normalizedRole === "technician" || normalizedRole === "user") {
    return "engineer";
  }

  return "engineer";
};

export const getStoredUser = (): StoredUser => {
  try {
    return JSON.parse(window.localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export const getStoredToken = () => window.localStorage.getItem("token");

export const isOfflineCapableRole = (role: unknown) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "manager" || normalizedRole === "engineer";
};

export const persistOfflineSession = (user: StoredUser) => {
  if (!user.id || !isOfflineCapableRole(user.role)) {
    window.localStorage.removeItem(OFFLINE_SESSION_KEY);
    return;
  }

  const now = Date.now();
  const sessionRecord: OfflineSessionRecord = {
    userId: user.id,
    role: normalizeRole(user.role),
    createdAt: now,
    expiresAt: now + OFFLINE_SESSION_MAX_AGE_MS,
  };

  window.localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(sessionRecord));
};

export const clearOfflineSession = () => {
  window.localStorage.removeItem(OFFLINE_SESSION_KEY);
};

export const hasValidOfflineSession = () => {
  try {
    const record = JSON.parse(window.localStorage.getItem(OFFLINE_SESSION_KEY) || "null") as OfflineSessionRecord | null;
    const user = getStoredUser();
    const token = getStoredToken();

    if (!record || !user.id || !token) {
      return false;
    }

    if (!isOfflineCapableRole(user.role) || normalizeRole(user.role) !== record.role) {
      return false;
    }

    if (record.userId !== user.id || record.expiresAt <= Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

export const dispatchOfflineQueueChanged = () => {
  window.dispatchEvent(new Event(OFFLINE_QUEUE_CHANGED_EVENT));
};

export const dispatchOfflineSyncEvent = (detail: Record<string, unknown>) => {
  window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT, { detail }));
};

export const buildUserScopedCacheKey = (resource: string, identifier?: string) => {
  const user = getStoredUser();
  return [user.id || "anonymous", resource, identifier].filter(Boolean).join(":");
};

export const createLocalId = (prefix: string) => {
  const randomValue = typeof window !== "undefined" && window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}:${randomValue}`;
};