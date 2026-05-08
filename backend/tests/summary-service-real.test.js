jest.mock("../src/models/summary.model", () => ({
  getSummaryStats: jest.fn(),
  getCreatedCountsByPeriod: jest.fn(),
  getCompletedCountsByPeriod: jest.fn(),
  getJobsByStatus: jest.fn(),
  getFleetCondition: jest.fn(),
}));

const summaryModel = require("../src/models/summary.model");
const summaryService = require("../src/services/summary.service.real");

describe("summary.service.real", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    summaryModel.getSummaryStats.mockResolvedValue({
      created: 10,
      completed: 6,
      overdue: 1,
    });
    summaryModel.getJobsByStatus.mockResolvedValue([]);
    summaryModel.getFleetCondition.mockResolvedValue([]);
  });

  test("merges created and completed counts for the same week day in chronological order", async () => {
    summaryModel.getCreatedCountsByPeriod.mockResolvedValue([
      { period_start: new Date("2026-05-05T00:00:00.000Z"), total: 4 },
      { period_start: new Date("2026-05-06T00:00:00.000Z"), total: 6 },
    ]);
    summaryModel.getCompletedCountsByPeriod.mockResolvedValue([
      { period_start: new Date("2026-05-05T00:00:00.000Z"), total: 1 },
      { period_start: new Date("2026-05-06T00:00:00.000Z"), total: 5 },
    ]);

    const result = await summaryService.getSummaryData("week");

    expect(result.createdCompletedData).toEqual([
      { date: "Tue 5", created: 4, completed: 1 },
      { date: "Wed 6", created: 6, completed: 5 },
    ]);
  });

  test("merges monthly buckets for year summaries instead of duplicating month labels", async () => {
    summaryModel.getCreatedCountsByPeriod.mockResolvedValue([
      { period_start: new Date("2026-03-01T00:00:00.000Z"), total: 1 },
      { period_start: new Date("2026-05-01T00:00:00.000Z"), total: 8 },
    ]);
    summaryModel.getCompletedCountsByPeriod.mockResolvedValue([
      { period_start: new Date("2026-04-01T00:00:00.000Z"), total: 2 },
      { period_start: new Date("2026-05-01T00:00:00.000Z"), total: 4 },
    ]);

    const result = await summaryService.getSummaryData("year");

    expect(result.createdCompletedData).toEqual([
      { date: "Mar", created: 1, completed: 0 },
      { date: "Apr", created: 0, completed: 2 },
      { date: "May", created: 8, completed: 4 },
    ]);
  });
});