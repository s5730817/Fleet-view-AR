import type { OfflineOperation } from "@/lib/offline-store";

type MaintenanceEntryLike = {
  type?: string;
  resolved_issue_ids?: string[];
};

export const maintenanceEntryRequiresManagerApproval = (entry: MaintenanceEntryLike | null | undefined) => {
  if (!entry) {
    return false;
  }

  const resolvedIssueIds = Array.isArray(entry.resolved_issue_ids) ? entry.resolved_issue_ids : [];

  return entry.type === "repair"
    || entry.type === "replacement"
    || resolvedIssueIds.length > 0;
};

export const operationRequiresManagerApproval = (operation: OfflineOperation) => {
  if (operation.kind !== "addMaintenanceEntry") {
    return false;
  }

  return maintenanceEntryRequiresManagerApproval(
    (operation.payload.entry || null) as MaintenanceEntryLike | null
  );
};