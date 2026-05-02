// This file contains temporary mock job logic until the database is ready.

// Temporary mock jobs
const mockJobs = [
  {
    id: "job-001",
    busId: "bus-002",
    busName: "BCP Bus 2",
    componentId: "brakes",
    componentName: "Brakes",
    title: "Brake system inspection",
    status: "Assigned",
    urgency: "High",
    assignedTo: "tech-1",
    assignedToName: "Tech 1",
    dueDate: "2026-05-06",
    createdAt: "2026-05-01"
  },
  {
    id: "job-002",
    busId: "bus-008",
    busName: "BCP Bus 8",
    componentId: "tires",
    componentName: "Tires",
    title: "Tyre condition check",
    status: "Assigned",
    urgency: "Medium",
    assignedTo: "tech-1",
    assignedToName: "Tech 1",
    dueDate: "2026-05-09",
    createdAt: "2026-05-02"
  },
  {
    id: "job-003",
    busId: "bus-012",
    busName: "BCP Bus 12",
    componentId: "cooling",
    componentName: "Cooling System",
    title: "Cooling system service",
    status: "Assigned",
    urgency: "Medium",
    assignedTo: "tech-1",
    assignedToName: "Tech 1",
    dueDate: "2026-05-11",
    createdAt: "2026-05-03"
  },
  {
    id: "job-004",
    busId: "bus-015",
    busName: "BCP Bus 15",
    componentId: "battery",
    componentName: "Battery",
    title: "Battery health check",
    status: "Assigned",
    urgency: "Low",
    assignedTo: "tech-1",
    assignedToName: "Tech 1",
    dueDate: "2026-05-14",
    createdAt: "2026-05-04"
  },
  {
    id: "job-005",
    busId: "bus-004",
    busName: "BCP Bus 4",
    componentId: "engine",
    componentName: "Engine",
    title: "Engine fault diagnosis",
    status: "Assigned",
    urgency: "High",
    assignedTo: "tech-2",
    assignedToName: "Tech 2",
    dueDate: "2026-05-04",
    createdAt: "2026-05-01"
  },
  {
    id: "job-006",
    busId: "bus-010",
    busName: "BCP Bus 10",
    componentId: "suspension",
    componentName: "Suspension",
    title: "Suspension repair assessment",
    status: "Assigned",
    urgency: "High",
    assignedTo: "tech-2",
    assignedToName: "Tech 2",
    dueDate: "2026-05-07",
    createdAt: "2026-05-02"
  },
  {
    id: "job-007",
    busId: "bus-017",
    busName: "BCP Bus 17",
    componentId: "cooling",
    componentName: "Cooling System",
    title: "Cooling leak investigation",
    status: "Assigned",
    urgency: "High",
    assignedTo: "tech-2",
    assignedToName: "Tech 2",
    dueDate: "2026-05-08",
    createdAt: "2026-05-03"
  },
  {
    id: "job-008",
    busId: "bus-006",
    busName: "BCP Bus 6",
    componentId: "brakes",
    componentName: "Brakes",
    title: "Brake pad follow-up check",
    status: "Assigned",
    urgency: "Low",
    assignedTo: "tech-2",
    assignedToName: "Tech 2",
    dueDate: "2026-05-15",
    createdAt: "2026-05-04"
  }
];

// GET jobs based on logged-in user's role
exports.getJobsForUser = async (user) => {
  if (user.role === "admin" || user.role === "manager") {
    return mockJobs;
  }

  return mockJobs.filter((job) => job.assignedTo === user.id);
};