// This file contains temporary mock summary logic until the database is ready.

const fleetService = require("./fleet.service");

const summaryDataByPeriod = {
  week: {
    period: "week",
    periodLabel: "This Week",

    summaryStats: {
      created: 28,
      completed: 22,
      completionRate: "78.6%",
      overdue: 6,
    },

    createdCompletedData: [
      { date: "Mon", created: 4, completed: 3 },
      { date: "Tue", created: 6, completed: 5 },
      { date: "Wed", created: 5, completed: 4 },
      { date: "Thu", created: 7, completed: 6 },
      { date: "Fri", created: 6, completed: 4 },
    ],

    onTimeOverdueData: [
      { name: "On Time", value: 22 },
      { name: "Overdue", value: 6 },
    ],

    jobsByStatusData: [
      { status: "Open", value: 4 },
      { status: "In Progress", value: 2 },
      { status: "Completed", value: 16 },
      { status: "Overdue", value: 6 },
    ],
  },

  month: {
    period: "month",
    periodLabel: "This Month",

    summaryStats: {
      created: 118,
      completed: 104,
      completionRate: "88.1%",
      overdue: 14,
    },

    createdCompletedData: [
      { date: "Week 1", created: 24, completed: 20 },
      { date: "Week 2", created: 31, completed: 28 },
      { date: "Week 3", created: 34, completed: 31 },
      { date: "Week 4", created: 29, completed: 25 },
    ],

    onTimeOverdueData: [
      { name: "On Time", value: 104 },
      { name: "Overdue", value: 14 },
    ],

    jobsByStatusData: [
      { status: "Open", value: 8 },
      { status: "In Progress", value: 6 },
      { status: "Completed", value: 90 },
      { status: "Overdue", value: 14 },
    ],
  },

  "3months": {
    period: "3months",
    periodLabel: "Last 3 Months",

    summaryStats: {
      created: 312,
      completed: 284,
      completionRate: "91.0%",
      overdue: 28,
    },

    createdCompletedData: [
      { date: "Month 1", created: 94, completed: 87 },
      { date: "Month 2", created: 102, completed: 94 },
      { date: "Month 3", created: 116, completed: 103 },
    ],

    onTimeOverdueData: [
      { name: "On Time", value: 284 },
      { name: "Overdue", value: 28 },
    ],

    jobsByStatusData: [
      { status: "Open", value: 15 },
      { status: "In Progress", value: 13 },
      { status: "Completed", value: 256 },
      { status: "Overdue", value: 28 },
    ],
  },

  "6months": {
    period: "6months",
    periodLabel: "Last 6 Months",

    summaryStats: {
      created: 628,
      completed: 581,
      completionRate: "92.5%",
      overdue: 47,
    },

    createdCompletedData: [
      { date: "Month 1", created: 92, completed: 85 },
      { date: "Month 2", created: 98, completed: 91 },
      { date: "Month 3", created: 105, completed: 98 },
      { date: "Month 4", created: 110, completed: 103 },
      { date: "Month 5", created: 108, completed: 101 },
      { date: "Month 6", created: 115, completed: 103 },
    ],

    onTimeOverdueData: [
      { name: "On Time", value: 581 },
      { name: "Overdue", value: 47 },
    ],

    jobsByStatusData: [
      { status: "Open", value: 22 },
      { status: "In Progress", value: 25 },
      { status: "Completed", value: 534 },
      { status: "Overdue", value: 47 },
    ],
  },

  year: {
    period: "year",
    periodLabel: "This Year",

    summaryStats: {
      created: 1240,
      completed: 1168,
      completionRate: "94.2%",
      overdue: 72,
    },

    createdCompletedData: [
      { date: "Jan", created: 96, completed: 91 },
      { date: "Feb", created: 104, completed: 98 },
      { date: "Mar", created: 110, completed: 104 },
      { date: "Apr", created: 118, completed: 109 },
      { date: "May", created: 102, completed: 97 },
      { date: "Jun", created: 108, completed: 101 },
      { date: "Jul", created: 99, completed: 94 },
      { date: "Aug", created: 106, completed: 100 },
      { date: "Sep", created: 112, completed: 106 },
      { date: "Oct", created: 103, completed: 97 },
      { date: "Nov", created: 96, completed: 91 },
      { date: "Dec", created: 86, completed: 80 },
    ],

    onTimeOverdueData: [
      { name: "On Time", value: 1168 },
      { name: "Overdue", value: 72 },
    ],

    jobsByStatusData: [
      { status: "Open", value: 34 },
      { status: "In Progress", value: 38 },
      { status: "Completed", value: 1096 },
      { status: "Overdue", value: 72 },
    ],
  },
};

exports.getSummaryData = async (period = "week") => {
  const fleet = await fleetService.getAllBuses();

  const good = fleet.filter((bus) => bus.status === "Good").length;

  const requiresAttention = fleet.filter(
    (bus) => bus.status === "Requires Attention"
  ).length;

  const outOfOperation = fleet.filter(
    (bus) => bus.status === "Out Of Operation"
  ).length;

  const selected =
    summaryDataByPeriod[period] || summaryDataByPeriod.week;

  return {
    ...selected,

    fleetConditionData: [
      { name: "Good", value: good },
      { name: "Requires Attention", value: requiresAttention },
      { name: "Out Of Operation", value: outOfOperation },
    ],
  };
};