jest.mock("../src/database/db", () => ({
  withTransaction: jest.fn(),
  query: jest.fn()
}));

jest.mock("../src/models/fault.model", () => ({
  createFault: jest.fn(),
  createFaultUpdate: jest.fn(),
  getFaultById: jest.fn(),
  updateFaultStatus: jest.fn()
}));

jest.mock("../src/models/fleet.model", () => ({
  reconcilePartConditionFromActiveIssues: jest.fn()
}));

const db = require("../src/database/db");
const faultModel = require("../src/models/fault.model");
const fleetModel = require("../src/models/fleet.model");
const faultService = require("../src/services/fault.service.real");

describe("fault status synchronization", () => {
  const transactionClient = { query: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    db.withTransaction.mockImplementation(async (callback) => callback(transactionClient));
  });

  test("reconciles the linked part when a fault status changes", async () => {
    faultModel.getFaultById
      .mockResolvedValueOnce({
        id: "issue-1",
        bus_part_id: "part-1",
        status: "reported"
      })
      .mockResolvedValueOnce({
        id: "issue-1",
        bus_part_id: "part-1",
        status: "resolved"
      });

    const result = await faultService.updateFaultStatus("issue-1", {
      status: "resolved",
      created_by: "user-1"
    });

    expect(faultModel.updateFaultStatus).toHaveBeenCalledWith("issue-1", "resolved", transactionClient);
    expect(faultModel.createFaultUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_id: "issue-1",
        status_from: "reported",
        status_to: "resolved"
      }),
      transactionClient
    );
    expect(fleetModel.reconcilePartConditionFromActiveIssues).toHaveBeenCalledWith("part-1", transactionClient);
    expect(result.status).toBe("resolved");
  });

  test("reconciles the part from active issues when creating a new fault", async () => {
    faultModel.getFaultById.mockResolvedValue({
      id: "issue-2",
      bus_part_id: "part-2",
      status: "reported"
    });

    await faultService.createFault({
      title: "Engine warning",
      bus_part_id: "part-2",
      issue_type_id: "issue-type-1",
      priority: "high"
    });

    expect(faultModel.createFault).toHaveBeenCalledWith(
      expect.objectContaining({
        bus_part_id: "part-2",
        status: "reported",
        priority: "high"
      }),
      transactionClient
    );
    expect(fleetModel.reconcilePartConditionFromActiveIssues).toHaveBeenCalledWith("part-2", transactionClient);
  });
});