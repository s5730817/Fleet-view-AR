import { describe, expect, it } from "vitest";
import { composeBusARContext } from "./ar-context-cache";
import type { ARCatalog, BusARSnapshot } from "@/types/fleet";

const snapshot: BusARSnapshot = {
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
      code: "brakes",
      name: "Brake Assembly",
      markerCode: 21,
      icon: "Cog",
      status: "Requires Attention",
      maintenanceIndicator: {
        state: "due_today",
        label: "Routine due today",
        dueDate: "2026-05-06",
        daysUntilDue: 0,
        isDueSoon: true,
        isOverdue: false,
      },
      conditionState: "repair_needed",
      conditionLabel: "Requires Attention",
      lifecycleState: "near_end_of_life",
      lifecycleLabel: "Near end of life",
      arInstructions: ["Inspect brake line", "Check pad wear"],
      activeIssues: [
        {
          id: "issue-1",
          title: "Brake pressure warning",
          status: "reported",
          priority: "high",
          description: "Pressure dropped below threshold",
          createdAt: "2026-05-06T10:00:00.000Z",
          latestComment: "Queued offline",
          issueTypeId: "issue-type-1",
          issueTypeKey: "brake-pressure",
          issueTypeLabel: "Brake pressure warning",
          recommendedAction: "repair",
          assignedTo: null,
          assignedToName: null,
          assignedToEmail: null,
        },
      ],
    },
  ],
};

const catalog: ARCatalog = {
  issueTypesByPartCode: {
    brakes: [
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
          requiredToolTypes: ["Diagnostic Scanner"],
        },
      },
    ],
  },
  depotResourcesById: {
    "depot-1": {
      depotId: "depot-1",
      depotName: "North Depot",
      assignableUsers: [
        {
          id: "user-1",
          name: "Tech One",
          email: "tech1@test.com",
          role: "engineer",
        },
      ],
      tools: [
        {
          id: "tool-1",
          name: "Diagnostic Scanner",
          markerCode: 500,
          status: "available",
          depotName: "North Depot",
        },
      ],
    },
  },
};

describe("composeBusARContext", () => {
  it("rebuilds a full AR context from cached snapshot and catalog", () => {
    const result = composeBusARContext(snapshot, catalog);

    expect(result.parts[0].issueTypeOptions).toHaveLength(1);
    expect(result.parts[0].activeIssues[0].guide.title).toBe("Brake repair");
    expect(result.assignableUsers).toHaveLength(1);
    expect(result.tools).toHaveLength(1);
  });
});