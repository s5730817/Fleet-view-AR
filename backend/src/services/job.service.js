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
    assignedToName: "Technician One",
    dueDate: "2026-05-06",
    createdAt: "2026-05-01"
  },
  {
    id: "job-002",
    busId: "bus-004",
    busName: "BCP Bus 4",
    componentId: "engine",
    componentName: "Engine",
    title: "Engine fault diagnosis",
    status: "Assigned",
    urgency: "Critical",
    assignedTo: "tech-2",
    assignedToName: "Technician Two",
    dueDate: "2026-05-04",
    createdAt: "2026-05-01"
  },
  {
    id: "job-003",
    busId: "bus-008",
    busName: "BCP Bus 8",
    componentId: "tires",
    componentName: "Tires",
    title: "Tyre condition check",
    status: "Assigned",
    urgency: "Medium",
    assignedTo: "tech-1",
    assignedToName: "Technician One",
    dueDate: "2026-05-09",
    createdAt: "2026-05-02"
  }
];

// GET jobs based on logged-in user's role
exports.getJobsForUser = async (user) => {
  if (user.role === "admin" || user.role === "manager") {
    return mockJobs;
  }

  return mockJobs.filter((job) => job.assignedTo === user.id);
};