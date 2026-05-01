// This file contains the main fault logic and validation before database queries run.

const { randomUUID } = require("crypto");
const faultModel = require("../models/fault.model");
const {
  allowedStatuses,
  allowedPriorities,
  allowedSorts
} = require("../utils/fault.validators");

// Get dashboard summary for faults
exports.getFaultSummary = async () => {
  return await faultModel.getFaultSummary();
};

// Get all faults with validation
exports.getAllFaults = async ({ status, priority, sort }) => {
  // Validate filters if provided
  if (status && !allowedStatuses.includes(status)) {
    throw new Error("Invalid status filter");
  }

  if (priority && !allowedPriorities.includes(priority)) {
    throw new Error("Invalid priority filter");
  }

  if (sort && !allowedSorts.includes(sort)) {
    throw new Error("Invalid sort value");
  }

  return await faultModel.getAllFaults({ status, priority, sort });
};

// Get one fault by id
exports.getFaultById = async (id) => {
  return await faultModel.getFaultById(id);
};

// Create a new fault with defaults and validation
exports.createFault = async ({ title, description, status, priority }) => {
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

  const faultId = randomUUID();

  await faultModel.createFault({
    id: randomUUID(),
    title,
    description: description || null,
    status: finalStatus,
    priority: finalPriority
  });

  return await faultModel.getFaultById(faultId);
};

// Update a fault's status and create a history record
exports.updateFaultStatus = async (id, { status, created_by }) => {
  if (!status) {
    throw new Error("Status is required");
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid status value");
  }

  const existingFault = await faultModel.getFaultById(id);

  if (!existingFault) {
    return null;
  }

  const oldStatus = existingFault.status;

  await faultModel.updateFaultStatus(id, status);

  await faultModel.createFaultUpdate({
    id: randomUUID(),
    issue_id: id,
    created_by: created_by || null,
    update_type: "status_change",
    description: `Status changed from ${oldStatus} to ${status}`,
    status_from: oldStatus,
    status_to: status,
    new_issue_id: null
  });

  return await faultModel.getFaultById(id);
};

// Get all updates for one fault
exports.getFaultUpdates = async (id) => {
  const fault = await faultModel.getFaultById(id);

  if (!fault) {
    return null;
  }

  return await faultModel.getFaultUpdates(id);
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

  const fault = await faultModel.getFaultById(id);

  if (!fault) {
    return null;
  }

  const updateId = randomUUID();

  await faultModel.createFaultUpdate({
    id: updateId,
    issue_id: id,
    created_by: created_by || null,
    update_type,
    description,
    status_from: status_from || null,
    status_to: status_to || null,
    new_issue_id: new_issue_id || null
  });

  return await faultModel.getFaultUpdateById(updateId);
};