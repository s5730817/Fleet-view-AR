import { describe, expect, it } from "vitest";
import {
  applyOptimisticARContextOperations,
  applyOptimisticBusOperations,
  applyOptimisticFleetOperations,
} from "./offline-optimistic";
import type { Bus, BusARContext } from "@/types/fleet";
import type { OfflineOperation } from "@/lib/offline-store";

const baseBus = (): Bus => ({
  id: "bus-1",
  name: "Demo Bus",
  plateNumber: "DMO-100",
  depotId: "depot-1",
  depotName: "North Depot",
  status: "Good",
  mileage: 12000,
  lastServiceDate: "2026-05-01",
  nextServiceDate: "2026-06-01",
  year: 2024,
  model: "Voltra",
  issueIndicator: {
    state: "none",
    label: "No active reports",
    activeCount: 0,
    inProgressCount: 0,
  },
  componentIndicator: {
    state: "good",
    label: "All components healthy",
    requiresAttentionCount: 0,
    outOfOperationCount: 0,
    overdueMaintenanceCount: 0,
    openReportCount: 0,
    replacementCount: 0,
  },
  serviceIndicator: {
    state: "ok",
    label: "On schedule",
    dueDate: "2026-06-01",
    daysUntilDue: 26,
    isDueSoon: false,
    isOverdue: false,
  },
  components: [
    {
      id: "part-1",
      code: "BRK-1",
      name: "Brake Assembly",
      markerCode: 101,
      icon: "Cog",
      status: "Good",
      statusState: "good",
      statusNote: null,
      conditionState: "good",
      conditionLabel: "Good",
      lifecycleState: "within_expected_life",
      lifecycleLabel: "Within service life",
      maintenanceIndicator: {
        state: "ok",
        label: "On schedule",
        dueDate: "2026-06-01",
        daysUntilDue: 26,
        isDueSoon: false,
        isOverdue: false,
      },
      activeIssueCount: 0,
      inProgressIssueCount: 0,
      lastRepair: "2026-04-01",
      lastInspected: "2026-05-01",
      lastService: "2026-05-01",
      lastReplacement: "2026-01-15",
      history: [],
      arInstructions: [],
    },
  ],
});

const baseARContext = (): BusARContext => ({
  bus: {
    id: "bus-1",
    name: "Demo Bus",
    plateNumber: "DMO-100",
    depotId: "depot-1",
    depotName: "North Depot",
    status: "Good",
  },
  parts: [
    {
      id: "part-1",
      code: "BRK-1",
      name: "Brake Assembly",
      markerCode: 101,
      icon: "Cog",
      status: "Good",
      maintenanceIndicator: {
        state: "ok",
        label: "On schedule",
        dueDate: "2026-06-01",
        daysUntilDue: 26,
        isDueSoon: false,
        isOverdue: false,
      },
      conditionState: "good",
      conditionLabel: "Good",
      lifecycleState: "within_expected_life",
      lifecycleLabel: "Within service life",
      arInstructions: [],
      issueTypeOptions: [
        {
          id: "issue-type-1",
          key: "brake-pressure",
          label: "Brake pressure warning",
          summary: "Brake pressure dropped below threshold",
          priority: "high",
          recommendedAction: "repair",
          guide: {
            title: "Brake repair",
            recommendedAction: "repair",
            steps: ["Inspect brake line"],
            requiredToolTypes: ["brake_kit"],
          },
        },
      ],
      activeIssues: [],
    },
  ],
  assignableUsers: [],
  tools: [],
});

const createFaultOperation = (): OfflineOperation => ({
  id: "op-1",
  kind: "createFault",
  createdAt: Date.now(),
  status: "pending",
  busId: "bus-1",
  busName: "Demo Bus",
  summary: "Offline issue: Brake pressure warning",
  payload: {
    localIssueId: "offline-issue-1",
    request: {
      title: "Brake pressure warning",
      description: "Pressure below threshold",
      priority: "high",
      bus_part_id: "part-1",
      issue_type_id: "issue-type-1",
    },
  },
});

describe("offline optimistic overlay", () => {
  it("applies pending issue creation and repair logs to bus data", () => {
    const operations: OfflineOperation[] = [
      createFaultOperation(),
      {
        id: "op-2",
        kind: "addMaintenanceEntry",
        createdAt: Date.now() + 1,
        status: "pending",
        busId: "bus-1",
        busName: "Demo Bus",
        summary: "Offline repair log",
        payload: {
          busId: "bus-1",
          componentId: "part-1",
          entry: {
            type: "repair",
            description: "Repaired brake line",
            resolved_issue_ids: ["offline-issue-1"],
          },
        },
      },
    ];

    const result = applyOptimisticBusOperations(baseBus(), operations);

    expect(result.issueIndicator.activeCount).toBe(0);
    expect(result.issueIndicator.state).toBe("none");
    expect(result.components[0].history).toHaveLength(2);
    expect(result.components[0].history[0].description).toContain("pending offline sync");
    expect(result.components[0].history[1].type).toBe("issue");
  });

  it("applies pending issue create, update, comment and resolution to AR data", () => {
    const operations: OfflineOperation[] = [
      createFaultOperation(),
      {
        id: "op-3",
        kind: "updateFaultStatus",
        createdAt: Date.now() + 2,
        status: "pending",
        busId: "bus-1",
        busName: "Demo Bus",
        summary: "Offline status update",
        payload: {
          issueId: "offline-issue-1",
          body: {
            status: "in_progress",
          },
        },
      },
      {
        id: "op-4",
        kind: "addFaultUpdate",
        createdAt: Date.now() + 3,
        status: "pending",
        busId: "bus-1",
        busName: "Demo Bus",
        summary: "Offline issue comment",
        payload: {
          issueId: "offline-issue-1",
          update: {
            description: "Technician inspected the brake line",
          },
        },
      },
      {
        id: "op-5",
        kind: "addMaintenanceEntry",
        createdAt: Date.now() + 4,
        status: "pending",
        busId: "bus-1",
        busName: "Demo Bus",
        summary: "Offline repair log",
        payload: {
          busId: "bus-1",
          componentId: "part-1",
          entry: {
            type: "repair",
            description: "Repaired brake line",
            resolved_issue_ids: ["offline-issue-1"],
          },
        },
      },
    ];

    const issueVisible = applyOptimisticARContextOperations(baseARContext(), operations.slice(0, 3));
    expect(issueVisible.parts[0].activeIssues).toHaveLength(1);
    expect(issueVisible.parts[0].activeIssues[0].status).toBe("in_progress");
    expect(issueVisible.parts[0].activeIssues[0].latestComment).toContain("pending offline sync");

    const resolved = applyOptimisticARContextOperations(baseARContext(), operations);
    expect(resolved.parts[0].activeIssues).toHaveLength(0);
  });

  it("applies overlays across fleet lists", () => {
    const result = applyOptimisticFleetOperations([baseBus()], [createFaultOperation()]);

    expect(result).toHaveLength(1);
    expect(result[0].issueIndicator.activeCount).toBe(1);
    expect(result[0].components[0].activeIssueCount).toBe(1);
  });
});