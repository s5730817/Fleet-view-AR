// This file contains the main fault logic using temporary mock data.

const { randomUUID } = require("crypto");
const {
  allowedStatuses,
  allowedPriorities,
  allowedSorts
} = require("../utils/fault.validators");

// Temporary mock faults
const mockFaults = [
  {
    id: "1",
    title: "Tunnel crack detected",
    status: "reported",
    priority: "high",
    created_at: "2026-04-11"
  },
  {
    id: "2",
    title: "Signal failure",
    status: "in_progress",
    priority: "medium",
    created_at: "2026-04-10"
  }
];

// Temporary mock fault updates
let mockFaultUpdates = [
  {
    id: "1",
    issue_id: "1",
    created_at: "2026-04-11T10:00:00.000Z",
    created_by: "engineer_1",
    update_type: "comment",
    description: "Initial inspection completed.",
    status_from: null,
    status_to: null,
    new_issue_id: null
  },
  {
    id: "2",
    issue_id: "1",
    created_at: "2026-04-11T11:00:00.000Z",
    created_by: "engineer_2",
    update_type: "status_change",
    description: "Status changed from reported to in_progress.",
    status_from: "reported",
    status_to: "in_progress",
    new_issue_id: null
  }
];

let mockIssueAssignments = [];

// Get dashboard summary for faults
exports.getFaultSummary = async () => {
  return {
    total: mockFaults.length,
    reported: mockFaults.filter((fault) => fault.status === "reported").length,
    in_progress: mockFaults.filter((fault) => fault.status === "in_progress").length,
    resolved: mockFaults.filter((fault) => fault.status === "resolved").length,
    high_priority: mockFaults.filter((fault) => fault.priority === "high").length,
    medium_priority: mockFaults.filter((fault) => fault.priority === "medium").length,
    low_priority: mockFaults.filter((fault) => fault.priority === "low").length
  };
};

// Get all faults with validation, filtering, and sorting
exports.getAllFaults = async ({ status, priority, sort }) => {
  if (status && !allowedStatuses.includes(status)) {
    throw new Error("Invalid status filter");
  }

  if (priority && !allowedPriorities.includes(priority)) {
    throw new Error("Invalid priority filter");
  }

  if (sort && !allowedSorts.includes(sort)) {
    throw new Error("Invalid sort value");
  }

  let filteredFaults = [...mockFaults];

  // Filter by status
  if (status) {
    filteredFaults = filteredFaults.filter((fault) => fault.status === status);
  }

  // Filter by priority
  if (priority) {
    filteredFaults = filteredFaults.filter((fault) => fault.priority === priority);
  }

  // Sort by created_at
  if (sort === "oldest") {
    filteredFaults.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  } else {
    // Default to newest first
    filteredFaults.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }

  return filteredFaults;
};

// Get one fault by id
exports.getFaultById = async (id) => {
  return mockFaults.find((fault) => fault.id === id) || null;
};

// Create a new fault
exports.createFault = async ({
  title,
  description,
  status,
  priority,
  bus_part_id,
  issue_type_id,
  source,
  created_by,
  assigned_user_id
}) => {
  if (!title) {
    throw new Error("Title is required");
  }

  const finalStatus = status || "reported";
  const finalPriority = priority || "medium";

  if (!allowedStatuses.includes(finalStatus)) {
    throw new Error("Invalid status value");
  }

  if (!allowedPriorities.includes(finalPriority)) {
    throw new Error("Invalid priority value");
  }

  const newFault = {
    id: randomUUID(),
    bus_part_id: bus_part_id || null,
    issue_type_id: issue_type_id || null,
    created_by: created_by || null,
    title,
    description: description || null,
    status: finalStatus,
    priority: finalPriority,
    created_at: new Date().toISOString(),
    source: source || null
  };

  mockFaults.push(newFault);

  if (assigned_user_id) {
    mockIssueAssignments.push({
      id: randomUUID(),
      issue_id: newFault.id,
      user_id: assigned_user_id,
      assigned_at: new Date().toISOString()
    });
  }

  return newFault;
};

// Update a fault's status and create a history record
exports.updateFaultStatus = async (id, { status, created_by }) => {
  if (!status) {
    throw new Error("Status is required");
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid status value");
  }

  const fault = mockFaults.find((fault) => fault.id === id);

  if (!fault) {
    return null;
  }

  const oldStatus = fault.status;
  fault.status = status;

  const statusUpdate = {
    id: randomUUID(),
    issue_id: id,
    created_at: new Date().toISOString(),
    created_by: created_by || "system_user",
    update_type: "status_change",
    description: `Status changed from ${oldStatus} to ${status}`,
    status_from: oldStatus,
    status_to: status,
    new_issue_id: null
  };

  mockFaultUpdates.push(statusUpdate);

  return fault;
};

// Get all updates for one fault
exports.getFaultUpdates = async (id) => {
  const fault = mockFaults.find((fault) => fault.id === id);

  if (!fault) {
    return null;
  }

  return mockFaultUpdates.filter((update) => update.issue_id === id);
};

// Add a new update for one fault
exports.addFaultUpdate = async (id, body) => {
  const {
    created_by,
    update_type,
    description,
    status_from,
    status_to,
    new_issue_id
  } = body;

  if (!update_type) {
    throw new Error("Update type is required");
  }

  if (!description) {
    throw new Error("Description is required");
  }

  const fault = mockFaults.find((fault) => fault.id === id);

  if (!fault) {
    return null;
  }

  const newUpdate = {
    id: randomUUID(),
    issue_id: id,
    created_at: new Date().toISOString(),
    created_by: created_by || "system_user",
    update_type,
    description,
    status_from: status_from || null,
    status_to: status_to || null,
    new_issue_id: new_issue_id || null
  };

  mockFaultUpdates.push(newUpdate);

  return newUpdate;
};