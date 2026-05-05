// This file stores allowed values used for validation whilst creating/sorting faults.

const allowedStatuses = ["reported", "in_progress", "awaiting_approval", "resolved"];
const allowedPriorities = ["low", "medium", "high"];
const allowedSorts = ["newest", "oldest"];

module.exports = {
  allowedStatuses,
  allowedPriorities,
  allowedSorts
};