jest.mock("../src/database/db", () => ({
  withTransaction: jest.fn()
}));

jest.mock("../src/models/auth.model", () => ({
  getUserById: jest.fn()
}));

jest.mock("../src/models/fleet.model", () => ({
  createMaintenanceEntry: jest.fn(),
  getAssignableUsersForDepot: jest.fn(),
  getBusById: jest.fn(),
  getIssuesForPartIds: jest.fn(),
  getPartsForBusIds: jest.fn(),
  reconcilePartConditionFromActiveIssues: jest.fn(),
  resolveActiveIssuesForPart: jest.fn(),
  updatePartLifecycleAfterMaintenance: jest.fn()
}));

const db = require("../src/database/db");
const authModel = require("../src/models/auth.model");
const fleetModel = require("../src/models/fleet.model");
const fleetService = require("../src/services/fleet.service.real");

describe("fleet maintenance flow", () => {
  const transactionClient = { query: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    db.withTransaction.mockImplementation(async (callback) => callback(transactionClient));
    authModel.getUserById.mockResolvedValue({
      id: "manager-1",
      role: "manager",
      depot_id: "depot-1",
      name: "Manager",
      email: "manager@test.com"
    });
    fleetModel.getBusById.mockResolvedValue({
      id: "bus-1",
      depot_id: "depot-1"
    });
    fleetModel.getPartsForBusIds.mockResolvedValue([
      { id: "part-1" }
    ]);
    fleetModel.getAssignableUsersForDepot.mockResolvedValue([
      { id: "tech-1", name: "Tech 1", email: "tech1@test.com", role: "engineer" },
      { id: "manager-1", name: "Manager", email: "manager@test.com", role: "manager" }
    ]);
    fleetModel.getIssuesForPartIds.mockResolvedValue([
      { id: "issue-1", status: "reported" }
    ]);
    fleetModel.createMaintenanceEntry.mockResolvedValue({
      id: "entry-1",
      created_at: "2026-05-06T00:00:00.000Z",
      entry_type: "service",
      description: "Routine service",
      notes: null,
      technician: "Tech 1"
    });
  });

  test("service logs do not auto-resolve active issues", async () => {
    await fleetService.addMaintenanceEntry("bus-1", "part-1", {
      type: "service",
      description: "Routine service",
      user_id: "tech-1"
    }, { id: "manager-1", role: "manager" });

    expect(fleetModel.createMaintenanceEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "tech-1",
        technician_name: "Tech 1",
        entry_type: "service"
      }),
      transactionClient
    );
    expect(fleetModel.resolveActiveIssuesForPart).not.toHaveBeenCalled();
    expect(fleetModel.reconcilePartConditionFromActiveIssues).toHaveBeenCalledWith("part-1", transactionClient);
  });

  test("service logs reject explicit issue resolution ids", async () => {
    await expect(
      fleetService.addMaintenanceEntry("bus-1", "part-1", {
        type: "service",
        description: "AR approval",
        user_id: "tech-1",
        resolved_issue_ids: ["issue-1"]
      }, { id: "manager-1", role: "manager" })
    ).rejects.toThrow("Service entries cannot resolve issues");

    expect(fleetModel.createMaintenanceEntry).not.toHaveBeenCalled();
    expect(fleetModel.resolveActiveIssuesForPart).not.toHaveBeenCalled();
  });

  test("repair logs resolve only the selected issue ids", async () => {
    fleetModel.createMaintenanceEntry.mockResolvedValue({
      id: "entry-2",
      created_at: "2026-05-06T00:00:00.000Z",
      entry_type: "repair",
      description: "Targeted repair",
      notes: null,
      technician: "Tech 1"
    });

    await fleetService.addMaintenanceEntry("bus-1", "part-1", {
      type: "repair",
      description: "Targeted repair",
      user_id: "tech-1",
      resolved_issue_ids: ["issue-1"]
    }, { id: "manager-1", role: "manager" });

    expect(fleetModel.resolveActiveIssuesForPart).toHaveBeenCalledWith(
      expect.objectContaining({
        partId: "part-1",
        createdBy: "manager-1",
        issueIds: ["issue-1"]
      }),
      transactionClient
    );
  });
});