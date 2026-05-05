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
  resolved: "Completed"
};

const getWeekKey = (date) => new Date(date).toISOString().slice(0, 10);

exports.getSummaryData = async () => {
  const [stats, createdRows, completedRows, priorityRows, statusRows] = await Promise.all([
    summaryModel.getSummaryStats(),
    summaryModel.getCreatedCountsByWeek(),
    summaryModel.getCompletedCountsByWeek(),
    summaryModel.getPriorityBreakdown(),
    summaryModel.getJobsByStatus()
  ]);

  const createdByWeek = new Map(createdRows.map((row) => [getWeekKey(row.week_start), row.total]));
  const completedByWeek = new Map(completedRows.map((row) => [getWeekKey(row.week_start), row.total]));

  const startOfCurrentWeek = new Date();
  startOfCurrentWeek.setHours(0, 0, 0, 0);
  startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - startOfCurrentWeek.getDay() + 1);

  const createdCompletedData = [];
  for (let offset = 3; offset >= 0; offset -= 1) {
    const weekStart = new Date(startOfCurrentWeek);
    weekStart.setDate(weekStart.getDate() - (offset * 7));
    const key = getWeekKey(weekStart);
    createdCompletedData.push({
      date: `Week ${4 - offset}`,
      created: createdByWeek.get(key) || 0,
      completed: completedByWeek.get(key) || 0
    });
  }

  const completionRate = stats.created === 0
    ? "0.0%"
    : `${((stats.completed / stats.created) * 100).toFixed(1)}%`;

  const priorityData = priorityRows.map((row) => ({
    name: priorityLabels[row.priority] || row.priority,
    value: row.total
  }));

  const onTimeCount = Math.max(stats.created - stats.overdue, 0);

  const jobsByStatusData = statusRows.map((row) => ({
    status: statusLabels[row.status] || row.status,
    value: row.total
  }));

  return {
    summaryStats: {
      created: stats.created,
      completed: stats.completed,
      completionRate,
      overdue: stats.overdue
    },
    createdCompletedData,
    priorityData,
    onTimeOverdueData: [
      { name: "On Time", value: onTimeCount },
      { name: "Overdue", value: stats.overdue }
    ],
    jobsByStatusData
  };
};