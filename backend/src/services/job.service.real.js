const jobModel = require("../models/job.model");

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

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
};

exports.getJobsForUser = async (user) => {
  const jobs = await jobModel.getJobs();
  const visibleJobs = (user.role === "admin" || user.role === "manager")
    ? jobs
    : jobs.filter((job) => job.assigned_to === user.id);

  return visibleJobs.map((job) => ({
    id: job.id,
    busId: job.bus_id,
    busName: job.bus_name,
    componentId: job.component_id,
    componentName: job.component_name,
    title: job.title,
    status: statusLabels[job.status] || job.status || "Open",
    urgency: priorityLabels[job.priority] || "Medium",
    assignedTo: job.assigned_to,
    assignedToName: job.assigned_to_name || null,
    dueDate: formatDate(job.due_at) || formatDate(job.created_at),
    createdAt: formatDate(job.created_at)
  }));
};