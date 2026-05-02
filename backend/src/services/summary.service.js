// This file contains temporary mock summary logic until the database is ready.

// Mock monthly maintenance summary data
exports.getSummaryData = async () => {
  return {
    summaryStats: {
      created: 469,
      completed: 451,
      completionRate: "96.1%",
      overdue: 138
    },

    createdCompletedData: [
      { date: "Week 1", created: 96, completed: 88 },
      { date: "Week 2", created: 121, completed: 117 },
      { date: "Week 3", created: 137, completed: 132 },
      { date: "Week 4", created: 115, completed: 114 }
    ],

    priorityData: [
      { name: "Low", value: 235 },
      { name: "Medium", value: 408 },
      { name: "High", value: 31 },
      { name: "Critical", value: 12 }
    ],

    onTimeOverdueData: [
      { name: "On Time", value: 941 },
      { name: "Overdue", value: 138 }
    ],

    jobsByStatusData: [
      { status: "Open", value: 72 },
      { status: "In Progress", value: 128 },
      { status: "Completed", value: 451 },
      { status: "Overdue", value: 138 }
    ]
  };
};