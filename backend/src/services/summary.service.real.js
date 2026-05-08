const summaryModel = require("../models/summary.model");

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical"
};

const statusLabels = {
  reported: "Open",
  in_progress: "In Progress",
  awaiting_approval: "Awaiting Approval",
  resolved: "Completed",
};

const busStatusLabels = {
  good: "Good",
  requires_attention: "Requires Attention",
  out_of_operation: "Out Of Operation",
};

exports.getSummaryData = async (period = "week", user) => {
  const normalizedPeriod = normalizePeriod(period);
  const [stats, createdRows, completedRows, priorityRows, statusRows] = await Promise.all([
    summaryModel.getSummaryStats(),
    summaryModel.getCreatedCountsByWeek(),
    summaryModel.getCompletedCountsByWeek(),
    summaryModel.getPriorityBreakdown(),
    summaryModel.getJobsByStatus()
  ]);

  const fleet = await fleetService.getAllBuses(user);

  const fleet = await fleetService.getAllBuses(user);

  const createdByPeriod = new Map(createdRows.map((row) => [row.period_start, row.total]));
  const completedByPeriod = new Map(completedRows.map((row) => [row.period_start, row.total]));

  const allKeys = [...new Set([...createdByPeriod.keys(), ...completedByPeriod.keys()])].sort();

  const createdCompletedData = allKeys.map((key) => ({
    date: new Date(key).toLocaleDateString("en-GB", {
      month: "short",
      day: period === "week" ? "numeric" : undefined,
      year: period === "year" || period === "6months" ? undefined : undefined,
    }),
    created: createdByPeriod.get(key) || 0,
    completed: completedByPeriod.get(key) || 0,
  }));

  const completionRate =
    stats.created === 0
      ? "0.0%"
      : `${((stats.completed / stats.created) * 100).toFixed(1)}%`;

  const onTimeCount = Math.max(stats.created - stats.overdue, 0);

  const jobsByStatusData = statusRows.map((row) => ({
    status: statusLabels[row.status] || row.status,
    value: row.total,
  }));

  const fleetConditionCounts = fleet.reduce((accumulator, bus) => {
    const status = bus.status || "Requires Attention";
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {
    Good: 0,
    "Requires Attention": 0,
    "Out Of Operation": 0
  });

  return {
    period: normalizedPeriod,
    periodLabel: periodLabels[normalizedPeriod],
    summaryStats: {
      created: stats.created,
      completed: stats.completed,
      completionRate,
      overdue: stats.overdue,
    },
    createdCompletedData,
    priorityData,
    fleetConditionData: [
      { name: "Good", value: fleetConditionCounts.Good },
      { name: "Requires Attention", value: fleetConditionCounts["Requires Attention"] },
      { name: "Out Of Operation", value: fleetConditionCounts["Out Of Operation"] }
    ],
    onTimeOverdueData: [
      { name: "On Time", value: onTimeCount },
      { name: "Overdue", value: stats.overdue }
    ],
    jobsByStatusData,
  };
};