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

const normalizePeriod = (period) => {
  if (Object.prototype.hasOwnProperty.call(periodLabels, period)) {
    return period;
  }

  return "week";
};

const padDatePart = (value) => String(value).padStart(2, "0");

const buildLocalDateKey = (date) => {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
};

const parseNormalizedDate = (value) => {
  if (typeof value === "string") {
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (parts) {
      const [, year, month, day] = parts;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  return new Date(value);
};

const normalizePeriodKey = (value) => {
  const date = parseNormalizedDate(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return buildLocalDateKey(date);
};

const formatPeriodDate = (period, value) => {
  const date = parseNormalizedDate(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  if (period === "week") {
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
    });
  }

  if (period === "month") {
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString("en-GB", {
    month: "short",
  });
};

exports.getSummaryData = async (period = "week", user) => {
  const normalizedPeriod = normalizePeriod(period);
  const [stats, createdRows, completedRows, statusRows, fleetConditionRows] = await Promise.all([
    summaryModel.getSummaryStats(normalizedPeriod),
    summaryModel.getCreatedCountsByPeriod(normalizedPeriod),
    summaryModel.getCompletedCountsByPeriod(normalizedPeriod),
    summaryModel.getJobsByStatus(normalizedPeriod),
    summaryModel.getFleetCondition(),
  ]);

  const createdByPeriod = new Map(
    createdRows.map((row) => [normalizePeriodKey(row.period_start), row.total])
  );
  const completedByPeriod = new Map(
    completedRows.map((row) => [normalizePeriodKey(row.period_start), row.total])
  );

  const allKeys = [...new Set([...createdByPeriod.keys(), ...completedByPeriod.keys()])].sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime()
  );

  const createdCompletedData = allKeys.map((key) => ({
    date: formatPeriodDate(normalizedPeriod, key),
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

  const fleetConditionCounts = fleetConditionRows.reduce((accumulator, row) => {
    const label = busStatusLabels[row.status] || row.status || "Requires Attention";
    accumulator[label] = row.total;
    return accumulator;
  }, {
    Good: 0,
    "Requires Attention": 0,
    "Out Of Operation": 0,
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
    fleetConditionData: [
      { name: "Good", value: fleetConditionCounts.Good },
      { name: "Requires Attention", value: fleetConditionCounts["Requires Attention"] },
      { name: "Out Of Operation", value: fleetConditionCounts["Out Of Operation"] },
    ],
    onTimeOverdueData: [
      { name: "On Time", value: onTimeCount },
      { name: "Overdue", value: stats.overdue },
    ],
    jobsByStatusData,
  };
};