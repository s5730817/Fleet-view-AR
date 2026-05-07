const fleetService = require("./fleet.service");

exports.getSummaryData = async () => {
  const fleet = await fleetService.getAllBuses();

  const good = fleet.filter((bus) => bus.status === "Good").length;
  const requiresAttention = fleet.filter((bus) => bus.status === "Requires Attention").length;
  const outOfOperation = fleet.filter((bus) => bus.status === "Out Of Operation").length;

  const overdueJobs = fleet.filter(
    (bus) => bus.serviceIndicator?.isOverdue
  ).length;

  const openJobs = fleet.reduce(
    (total, bus) => total + (bus.issueIndicator?.activeCount || 0),
    0
  );

  const inProgressJobs = fleet.reduce(
    (total, bus) => total + (bus.issueIndicator?.inProgressCount || 0),
    0
  );

  const mockHistoricalCompleted = 104;
  const mockCreated = mockHistoricalCompleted + openJobs + overdueJobs;

  return {
    summaryStats: {
      created: mockCreated,
      completed: mockHistoricalCompleted,
      completionRate: `${Math.round((mockHistoricalCompleted / mockCreated) * 100)}%`,
      overdue: overdueJobs,
    },

    createdCompletedData: [
      { date: "Week 1", created: 24, completed: 20 },
      { date: "Week 2", created: 31, completed: 28 },
      { date: "Week 3", created: 34, completed: 31 },
      { date: "Week 4", created: mockCreated - 89, completed: mockHistoricalCompleted - 79 },
    ],

    fleetConditionData: [
      { name: "Good", value: good },
      { name: "Requires Attention", value: requiresAttention },
      { name: "Out Of Operation", value: outOfOperation },
    ],

    onTimeOverdueData: [
      { name: "On Time", value: mockHistoricalCompleted },
      { name: "Overdue", value: overdueJobs },
    ],

    jobsByStatusData: [
      { status: "Open", value: openJobs },
      { status: "In Progress", value: inProgressJobs },
      { status: "Completed", value: mockHistoricalCompleted },
      { status: "Overdue", value: overdueJobs },
    ],
  };
};