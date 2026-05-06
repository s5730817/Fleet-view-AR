const fleetModel = require("../src/models/fleet.model");

describe("fleet model logging helpers", () => {
  test("records the previous issue status when maintenance resolves active issues", async () => {
    const executor = {
      query: jest.fn()
    };

    executor.query.mockResolvedValueOnce({
      rows: [
        {
          id: "issue-1",
          title: "Brake leak",
          status: "reported"
        }
      ]
    });
    executor.query.mockResolvedValueOnce({ rows: [] });

    await fleetModel.resolveActiveIssuesForPart({
      partId: "part-1",
      createdBy: "user-1",
      note: "Resolved through maintenance"
    }, executor);

    expect(executor.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("status_from"),
      [expect.any(String), "issue-1", "user-1", "Resolved through maintenance", "reported"]
    );
  });
});