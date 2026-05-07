import type {
  ARBusPart,
  ARIssue,
  ARIssueTypeOption,
  Bus,
  BusARContext,
  MaintenanceEntry,
} from "@/types/fleet";
import type { OfflineOperation } from "@/lib/offline-store";

const PENDING_HISTORY_DATE = "Pending sync";
const PENDING_TECHNICIAN = "Offline queue";

type PendingOperation = OfflineOperation & { status: "pending" };

type FaultRequestPayload = {
  title?: string;
  description?: string;
  priority?: ARIssue["priority"];
  bus_part_id?: string;
  issue_type_id?: string;
};

type MaintenancePayload = Partial<MaintenanceEntry> & {
  resolved_issue_ids?: string[];
};

const isPendingOperation = (operation: OfflineOperation): operation is PendingOperation =>
  operation.status === "pending";

const getPendingOperationsForBus = (operations: OfflineOperation[], busId?: string | null) =>
  operations.filter(
    (operation) => isPendingOperation(operation) && Boolean(busId) && operation.busId === busId
  );

const createPendingHistoryEntry = (
  operation: OfflineOperation,
  type: MaintenanceEntry["type"],
  description: string
): MaintenanceEntry => ({
  id: operation.id,
  date: PENDING_HISTORY_DATE,
  createdAt: new Date(operation.createdAt).toISOString(),
  type,
  description,
  technician: PENDING_TECHNICIAN,
});

const appendPendingSuffix = (value: string) =>
  value.includes("pending offline sync") ? value : `${value} (pending offline sync)`;

const findIssueTypeOption = (part: ARBusPart, issueTypeId?: string) =>
  part.issueTypeOptions.find((option) => option.id === issueTypeId) || null;

const buildOptimisticIssue = (
  operation: OfflineOperation,
  part: ARBusPart,
  request: FaultRequestPayload
): ARIssue => {
  const issueType = findIssueTypeOption(part, request.issue_type_id);

  return {
    id: (operation.payload.localIssueId as string | undefined) || operation.id,
    title: request.title || `Issue for ${part.name}`,
    status: "reported",
    priority: request.priority || "medium",
    description: request.description || "Queued offline",
    createdAt: new Date(operation.createdAt).toISOString(),
    latestComment: "Queued offline",
    issueTypeId: issueType?.id || request.issue_type_id || null,
    issueTypeKey: issueType?.key || null,
    issueTypeLabel: issueType?.label || "Offline issue",
    recommendedAction: issueType?.recommendedAction || "repair",
    assignedTo: null,
    assignedToName: null,
    assignedToEmail: null,
    guide: issueType?.guide || {
      title: "Offline review required",
      recommendedAction: "repair",
      steps: ["Reconnect and sync the queued issue"],
      requiredToolTypes: [],
    },
  };
};

const updateIssueIndicatorLabel = (count: number) => {
  if (count <= 0) {
    return "No active reports";
  }

  return `${count} open report${count === 1 ? "" : "s"}`;
};

export const applyOptimisticBusOperations = (bus: Bus, operations: OfflineOperation[]) => {
  const pendingOperations = getPendingOperationsForBus(operations, bus.id);

  if (pendingOperations.length === 0) {
    return bus;
  }

  const nextBus: Bus = {
    ...bus,
    issueIndicator: { ...bus.issueIndicator },
    componentIndicator: { ...bus.componentIndicator },
    components: bus.components.map((component) => ({
      ...component,
      history: [...component.history],
    })),
  };

  const componentsById = new Map(nextBus.components.map((component) => [component.id, component]));
  let issueDelta = 0;

  for (const operation of pendingOperations) {
    if (operation.kind === "createFault") {
      const request = (operation.payload.request || {}) as FaultRequestPayload;
      const componentId = request.bus_part_id;

      if (!componentId) {
        continue;
      }

      const component = componentsById.get(componentId);
      if (!component) {
        continue;
      }

      component.activeIssueCount += 1;
      component.statusNote = "Pending offline issue report";
      component.history.unshift(
        createPendingHistoryEntry(
          operation,
          "issue",
          appendPendingSuffix(request.title || `Issue logged for ${component.name}`)
        )
      );
      issueDelta += 1;
      continue;
    }

    if (operation.kind === "addMaintenanceEntry") {
      const componentId = operation.payload.componentId as string | undefined;
      const entry = (operation.payload.entry || {}) as MaintenancePayload;
      const component = componentId ? componentsById.get(componentId) : undefined;

      if (!component) {
        continue;
      }

      component.history.unshift(
        createPendingHistoryEntry(
          operation,
          entry.type || "service",
          appendPendingSuffix(entry.description || `Maintenance logged for ${component.name}`)
        )
      );

      const resolvedCount = Array.isArray(entry.resolved_issue_ids)
        ? entry.resolved_issue_ids.length
        : 0;

      if (resolvedCount > 0) {
        component.activeIssueCount = Math.max(0, component.activeIssueCount - resolvedCount);
        issueDelta -= resolvedCount;
      }
    }
  }

  if (issueDelta !== 0) {
    nextBus.issueIndicator.activeCount = Math.max(0, nextBus.issueIndicator.activeCount + issueDelta);
    nextBus.issueIndicator.label = updateIssueIndicatorLabel(nextBus.issueIndicator.activeCount);
    nextBus.issueIndicator.state =
      nextBus.issueIndicator.activeCount > 0
        ? nextBus.issueIndicator.state === "under_repair"
          ? "under_repair"
          : "open_reports"
        : "none";
    nextBus.componentIndicator.openReportCount = Math.max(
      0,
      nextBus.componentIndicator.openReportCount + issueDelta
    );
  }

  return nextBus;
};

const findPartWithIssue = (parts: ARBusPart[], issueId: string) =>
  parts.find((part) => part.activeIssues.some((issue) => issue.id === issueId)) || null;

const updateIssueInPart = (
  part: ARBusPart,
  issueId: string,
  updater: (issue: ARIssue) => ARIssue
) => ({
  ...part,
  activeIssues: part.activeIssues.map((issue) =>
    issue.id === issueId ? updater(issue) : issue
  ),
});

export const applyOptimisticARContextOperations = (
  arContext: BusARContext,
  operations: OfflineOperation[]
) => {
  const pendingOperations = getPendingOperationsForBus(operations, arContext.bus.id);

  if (pendingOperations.length === 0) {
    return arContext;
  }

  let nextParts = arContext.parts.map((part) => ({
    ...part,
    activeIssues: [...part.activeIssues],
  }));

  for (const operation of pendingOperations) {
    if (operation.kind === "createFault") {
      const request = (operation.payload.request || {}) as FaultRequestPayload;
      const componentId = request.bus_part_id;

      if (!componentId) {
        continue;
      }

      nextParts = nextParts.map((part) => {
        if (part.id !== componentId) {
          return part;
        }

        const optimisticIssue = buildOptimisticIssue(operation, part, request);

        return {
          ...part,
          activeIssues: [
            optimisticIssue,
            ...part.activeIssues.filter((issue) => issue.id !== optimisticIssue.id),
          ],
        };
      });
      continue;
    }

    if (operation.kind === "updateFaultStatus") {
      const issueId = operation.payload.issueId as string | undefined;
      const status = (operation.payload.body as { status?: ARIssue["status"] } | undefined)?.status;

      if (!issueId || !status) {
        continue;
      }

      nextParts = nextParts.map((part) =>
        part.activeIssues.some((issue) => issue.id === issueId)
          ? updateIssueInPart(part, issueId, (issue) => ({ ...issue, status }))
          : part
      );
      continue;
    }

    if (operation.kind === "addFaultUpdate") {
      const issueId = operation.payload.issueId as string | undefined;
      const description = (operation.payload.update as { description?: string } | undefined)?.description;

      if (!issueId || !description) {
        continue;
      }

      nextParts = nextParts.map((part) =>
        part.activeIssues.some((issue) => issue.id === issueId)
          ? updateIssueInPart(part, issueId, (issue) => ({
              ...issue,
              latestComment: appendPendingSuffix(description),
            }))
          : part
      );
      continue;
    }

    if (operation.kind === "addMaintenanceEntry") {
      const entry = (operation.payload.entry || {}) as MaintenancePayload;
      const resolvedIssueIds = Array.isArray(entry.resolved_issue_ids)
        ? entry.resolved_issue_ids
        : [];

      if (resolvedIssueIds.length === 0) {
        continue;
      }

      nextParts = nextParts.map((part) => ({
        ...part,
        activeIssues: part.activeIssues.filter(
          (issue) => !resolvedIssueIds.includes(issue.id)
        ),
      }));
    }
  }

  return {
    ...arContext,
    parts: nextParts,
  };
};

export const applyOptimisticFleetOperations = (
  fleet: Bus[],
  operations: OfflineOperation[]
) => fleet.map((bus) => applyOptimisticBusOperations(bus, operations));