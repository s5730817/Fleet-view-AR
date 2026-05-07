const summaryModel = require("../models/summary.model");

const periodLabels = {
  week: "This Week",
  month: "This Month",
  "3months": "Last 3 Months",
  "6months": "Last 6 Months",
  year: "This Year",
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

exports.getSummaryData = async (period = "week") => {
  const [stats, createdRows, completedRows, statusRows, fleetRows] = await Promise.all([
    summaryModel.getSummaryStats(period),
    summaryModel.getCreatedCountsByPeriod(period),
    summaryModel.getCompletedCountsByPeriod(period),
    summaryModel.getJobsByStatus(period),
    summaryModel.getFleetCondition(),
  ]);

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

  const fleetConditionData = [
    { name: "Good", value: fleetRows.find((r) => r.status === "Good")?.total || 0 },
    { name: "Requires Attention", value: fleetRows.find((r) => r.status === "Requires Attention")?.total || 0 },
    { name: "Out Of Operation", value: fleetRows.find((r) => r.status === "Out Of Operation")?.total || 0 },
  ];

  return {
    period,
    periodLabel: periodLabels[period] || "This Week",
    summaryStats: {
      created: stats.created,
      completed: stats.completed,
      completionRate,
      overdue: stats.overdue,
    },
    createdCompletedData,
    fleetConditionData,
    onTimeOverdueData: [
      { name: "On Time Jobs", value: onTimeCount },
      { name: "Jobs Overdue", value: stats.overdue },
    ],
    jobsByStatusData,
  };
};