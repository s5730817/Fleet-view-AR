jest.mock("../src/models/auth.model", () => ({
  getUserById: jest.fn()
}));

jest.mock("../src/models/fleet.model", () => ({
  getAllBuses: jest.fn(),
  getBusById: jest.fn(),
  getPartsForBusIds: jest.fn(),
  getLifecyclePoliciesForPartCodes: jest.fn(),
  getMaintenanceEntriesForPartIds: jest.fn(),
  getIssueHistoryForPartIds: jest.fn(),
  getIssuesForPartIds: jest.fn(),
  getIssueTypesForPartCodes: jest.fn(),
  getToolsForDepot: jest.fn(),
  getAssignableUsersForDepot: jest.fn(),
  createMaintenanceEntry: jest.fn(),
  updatePartLifecycleAfterMaintenance: jest.fn(),
  resolveActiveIssuesForPart: jest.fn()
}));

jest.mock("../src/database/db", () => ({
  withTransaction: jest.fn()
}));

const authModel = require("../src/models/auth.model");
const fleetModel = require("../src/models/fleet.model");
const fleetService = require("../src/services/fleet.service.real");

describe("fleet scope rules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fleetModel.getPartsForBusIds.mockResolvedValue([]);
    fleetModel.getLifecyclePoliciesForPartCodes.mockResolvedValue([]);
    fleetModel.getMaintenanceEntriesForPartIds.mockResolvedValue([]);
    fleetModel.getIssueHistoryForPartIds.mockResolvedValue([]);
    fleetModel.getIssuesForPartIds.mockResolvedValue([]);
    fleetModel.getIssueTypesForPartCodes.mockResolvedValue([]);
    fleetModel.getToolsForDepot.mockResolvedValue([]);
    fleetModel.getAssignableUsersForDepot.mockResolvedValue([]);
  });

  test("manager fleet access is restricted to their depot", async () => {
    authModel.getUserById.mockResolvedValue({
      id: "manager-1",
      role: "manager",
      depot_id: "depot-central"
    });
    fleetModel.getAllBuses.mockResolvedValue([
      {
        id: "bus-1",
        name: "Bus 1",
        depot_id: "depot-central",
        depot_name: "Central Depot",
        registration_number: "ABC-123",
        mileage: 123,
        last_service_at: null,
        next_service_at: null,
        year: 2022,
        model: "Model"
      }
    ]);

    await fleetService.getAllBuses({ id: "manager-1", role: "manager" });

    expect(fleetModel.getAllBuses).toHaveBeenCalledWith({ depotId: "depot-central" });
  });

  test("admin fleet access is not depot restricted", async () => {
    authModel.getUserById.mockResolvedValue({
      id: "admin-1",
      role: "admin",
      depot_id: "depot-north",
      name: "Admin",
      email: "admin@test.com"
    });
    fleetModel.getAllBuses.mockResolvedValue([]);

    await fleetService.getAllBuses({ id: "admin-1", role: "admin" });

    expect(authModel.getUserById).toHaveBeenCalledWith("admin-1");
    expect(fleetModel.getAllBuses).toHaveBeenCalledWith({ depotId: null });
  });

  test("admin issue assignment is limited to engineers in the bus depot", async () => {
    authModel.getUserById.mockResolvedValue({
      id: "admin-1",
      role: "admin",
      depot_id: "depot-north",
      name: "Admin",
      email: "admin@test.com"
    });
    fleetModel.getBusById.mockResolvedValue({
      id: "bus-1",
      name: "Bus 1",
      depot_id: "depot-central",
      depot_name: "Central Depot",
      registration_number: "ABC-123",
      next_service_at: null
    });
    fleetModel.getPartsForBusIds.mockResolvedValue([]);
    fleetModel.getAssignableUsersForDepot.mockResolvedValue([
      { id: "tech-1", name: "Tech 1", email: "tech1@test.com", role: "engineer" },
      { id: "manager-2", name: "Manager 2", email: "manager2@test.com", role: "manager" }
    ]);

    const context = await fleetService.getARContext("bus-1", { id: "admin-1", role: "admin" });

    expect(fleetModel.getBusById).toHaveBeenCalledWith("bus-1", { depotId: null });
    expect(fleetModel.getAssignableUsersForDepot).toHaveBeenCalledWith("depot-central");
    expect(context.assignableUsers.map((user) => user.id)).toEqual(["tech-1"]);
  });

  test("manager issue assignment stays within the visible depot", async () => {
    authModel.getUserById.mockResolvedValue({
      id: "manager-1",
      role: "manager",
      depot_id: "depot-central"
    });
    fleetModel.getBusById.mockResolvedValue({
      id: "bus-1",
      name: "Bus 1",
      depot_id: "depot-central",
      depot_name: "Central Depot",
      registration_number: "ABC-123",
      next_service_at: null
    });
    fleetModel.getPartsForBusIds.mockResolvedValue([]);

    await fleetService.getARContext("bus-1", { id: "manager-1", role: "manager" });

    expect(fleetModel.getBusById).toHaveBeenCalledWith("bus-1", { depotId: "depot-central" });
    expect(fleetModel.getAssignableUsersForDepot).toHaveBeenCalledWith("depot-central");
  });

  test("AR context exposes pending maintenance approval issues", async () => {
    authModel.getUserById.mockResolvedValue({
      id: "manager-1",
      role: "manager",
      depot_id: "depot-central"
    });
    fleetModel.getBusById.mockResolvedValue({
      id: "bus-1",
      name: "Bus 1",
      depot_id: "depot-central",
      depot_name: "Central Depot",
      registration_number: "ABC-123",
      next_service_at: null
    });
    fleetModel.getPartsForBusIds.mockResolvedValue([
      {
        id: "part-1",
        bus_id: "bus-1",
        name: "Brake Assembly",
        marker_code: 101,
        icon_key: "Wrench",
        condition_state: "repair_needed",
        lifecycle_state: "within_expected_life",
        last_inspected_at: null,
        ar_instructions: []
      }
    ]);
    fleetModel.getIssuesForPartIds.mockResolvedValue([
      {
        id: "issue-1",
        bus_part_id: "part-1",
        issue_type_id: null,
        title: "Approve repair",
        status: "awaiting_approval",
        priority: "medium",
        description: "Offline repair request",
        created_at: "2026-05-06T10:00:00.000Z",
        latest_comment: "Waiting for manager approval",
        issue_type_code: null,
        issue_type_label: null,
        issue_type_recommended_action: "repair",
        assigned_to: null,
        assigned_to_name: null,
        assigned_to_email: null,
        maintenance_approval_metadata: {
          kind: "maintenance_approval_request"
        }
      }
    ]);

    const context = await fleetService.getARContext("bus-1", { id: "manager-1", role: "manager" });

    expect(context.parts[0].activeIssues[0].pendingMaintenanceApproval).toBe(true);
  });
});