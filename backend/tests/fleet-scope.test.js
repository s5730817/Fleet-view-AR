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
    fleetModel.getAllBuses.mockResolvedValue([]);

    await fleetService.getAllBuses({ id: "admin-1", role: "admin" });

    expect(authModel.getUserById).not.toHaveBeenCalled();
    expect(fleetModel.getAllBuses).toHaveBeenCalledWith({ depotId: null });
  });

  test("admin issue assignment includes users across all depots", async () => {
    fleetModel.getBusById.mockResolvedValue({
      id: "bus-1",
      name: "Bus 1",
      depot_id: "depot-central",
      depot_name: "Central Depot",
      registration_number: "ABC-123",
      next_service_at: null
    });
    fleetModel.getPartsForBusIds.mockResolvedValue([]);

    await fleetService.getARContext("bus-1", { id: "admin-1", role: "admin" });

    expect(fleetModel.getBusById).toHaveBeenCalledWith("bus-1", { depotId: null });
    expect(fleetModel.getAssignableUsersForDepot).toHaveBeenCalledWith(null);
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
});