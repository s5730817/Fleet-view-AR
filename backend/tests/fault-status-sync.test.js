jest.mock("../src/database/db", () => ({
  withTransaction: jest.fn(),
  query: jest.fn()
}));

jest.mock("../src/models/auth.model", () => ({
  getUserById: jest.fn()
}));

jest.mock("../src/models/fault.model", () => ({
  createFault: jest.fn(),
  createIssueAssignment: jest.fn(),
  createFaultUpdate: jest.fn(),
  getFaultById: jest.fn(),
  updateFaultStatus: jest.fn()
}));

jest.mock("../src/models/fleet.model", () => ({
  getAssignableUsersForDepot: jest.fn(),
  getPartContextById: jest.fn(),
  reconcilePartConditionFromActiveIssues: jest.fn()
}));

const db = require("../src/database/db");
const authModel = require("../src/models/auth.model");
const faultModel = require("../src/models/fault.model");
const fleetModel = require("../src/models/fleet.model");
const faultService = require("../src/services/fault.service.real");

describe("fault status synchronization", () => {
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
    fleetModel.getPartContextById.mockResolvedValue({
      id: "part-1",
      bus_id: "bus-1",
      depot_id: "depot-1"
    });
    fleetModel.getAssignableUsersForDepot.mockResolvedValue([
      { id: "manager-1", name: "Manager", email: "manager@test.com", role: "manager" },
      { id: "tech-1", name: "Tech 1", email: "tech1@test.com", role: "engineer" }
    ]);
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
      status: "resolved"
    }, { id: "manager-1", role: "manager" });

    expect(faultModel.updateFaultStatus).toHaveBeenCalledWith("issue-1", "resolved", transactionClient);
    expect(faultModel.createFaultUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_id: "issue-1",
        created_by: "manager-1",
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
    fleetModel.getPartContextById.mockResolvedValue({
      id: "part-2",
      bus_id: "bus-1",
      depot_id: "depot-1"
    });

    await faultService.createFault({
      title: "Engine warning",
      bus_part_id: "part-2",
      issue_type_id: "issue-type-1",
      priority: "high",
      assigned_user_id: "tech-1"
    }, { id: "manager-1", role: "manager" });

    expect(faultModel.createFault).toHaveBeenCalledWith(
      expect.objectContaining({
        bus_part_id: "part-2",
        created_by: "manager-1",
        status: "reported",
        priority: "high"
      }),
      transactionClient
    );
    expect(faultModel.createIssueAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_id: expect.any(String),
        user_id: "tech-1"
      }),
      transactionClient
    );
    expect(fleetModel.reconcilePartConditionFromActiveIssues).toHaveBeenCalledWith("part-2", transactionClient);
  });

  test("engineer issue reports are auto-assigned to the reporting engineer", async () => {
    authModel.getUserById.mockResolvedValue({
      id: "tech-1",
      role: "engineer",
      depot_id: "depot-1",
      name: "Tech 1",
      email: "tech1@test.com"
    });
    faultModel.getFaultById.mockResolvedValue({
      id: "issue-3",
      bus_part_id: "part-2",
      status: "reported"
    });
    fleetModel.getPartContextById.mockResolvedValue({
      id: "part-2",
      bus_id: "bus-1",
      depot_id: "depot-1"
    });

    await faultService.createFault({
      title: "Engine warning",
      bus_part_id: "part-2",
      issue_type_id: "issue-type-1",
      priority: "high",
      assigned_user_id: "manager-1"
    }, { id: "tech-1", role: "engineer" });

    expect(faultModel.createIssueAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "tech-1"
      }),
      transactionClient
    );
  });

  test("manager cannot assign a fault to another manager or admin", async () => {
    await expect(
      faultService.createFault({
        title: "Engine warning",
        bus_part_id: "part-1",
        issue_type_id: "issue-type-1",
        priority: "high",
        assigned_user_id: "manager-1"
      }, { id: "manager-1", role: "manager" })
    ).rejects.toThrow("Selected assignee is not valid for this bus");

    expect(faultModel.createIssueAssignment).not.toHaveBeenCalled();
  });
});