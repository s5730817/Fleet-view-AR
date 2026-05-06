// This file contains the main fault logic and validation before database queries run.

const { randomUUID } = require("crypto");
const db = require("../database/db");
const authModel = require("../models/auth.model");
const faultModel = require("../models/fault.model");
const fleetModel = require("../models/fleet.model");
const {
  allowedStatuses,
  allowedPriorities,
  allowedSorts
} = require("../utils/fault.validators");

const resolveUserScope = async (user) => {
  const fallbackRole = typeof user?.role === "string" ? user.role.trim().toLowerCase() : null;

  if (!user?.id) {
    return {
      role: fallbackRole,
      depotId: null,
      restrictToDepot: fallbackRole !== "admin",
      actorId: null,
      currentUser: null,
    };
  }

  const persistedUser = await authModel.getUserById(user.id);
  const role = typeof persistedUser?.role === "string"
    ? persistedUser.role.trim().toLowerCase()
    : fallbackRole;

  return {
    role,
    depotId: persistedUser?.depot_id || null,
    restrictToDepot: role !== "admin",
    actorId: persistedUser?.id || user.id,
    currentUser: persistedUser || null,
  };
};

const canAccessPartContext = (scope, partContext) => {
  if (!partContext) {
    return false;
  }

  if (!scope.restrictToDepot) {
    return true;
  }

  return Boolean(scope.depotId) && scope.depotId === partContext.depot_id;
};

const buildIssueAssigneeUsers = (users) => users.filter((user) => user.role === "engineer");

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
}, actor) => {
  if (!title) {
    throw new Error("Title is required");
  }

  const scope = await resolveUserScope(actor);
  if (!scope.actorId || !scope.role) {
    throw new Error("Not authorised");
  }

  let partContext = null;
  if (bus_part_id) {
    partContext = await fleetModel.getPartContextById(bus_part_id);
    if (!partContext) {
      throw new Error("Bus part not found");
    }

    if (!canAccessPartContext(scope, partContext)) {
      throw new Error("Forbidden");
    }
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
  const assignedAt = new Date().toISOString();
  let finalAssignedUserId = null;

  if (scope.role === "engineer") {
    finalAssignedUserId = scope.actorId;
  } else if (partContext) {
    const issueAssigneeUsers = buildIssueAssigneeUsers(
      await fleetModel.getAssignableUsersForDepot(partContext.depot_id)
    );

    if (!assigned_user_id) {
      throw new Error("Assignee is required");
    }

    if (!issueAssigneeUsers.some((user) => user.id === assigned_user_id)) {
      throw new Error("Selected assignee is not valid for this bus");
    }

    finalAssignedUserId = assigned_user_id;
  }

  await db.withTransaction(async (client) => {
    await faultModel.createFault({
      id: faultId,
      bus_part_id: bus_part_id || null,
      issue_type_id: issue_type_id || null,
      created_by: scope.actorId,
      title,
      description: description || null,
      status: finalStatus,
      priority: finalPriority,
      source: source || null
    }, client);

    if (bus_part_id) {
      await fleetModel.reconcilePartConditionFromActiveIssues(bus_part_id, client);
    }

    if (finalAssignedUserId) {
      await faultModel.createIssueAssignment({
        id: randomUUID(),
        issue_id: faultId,
        user_id: finalAssignedUserId,
        assigned_at: assignedAt
      }, client);
    }
  });

  return await faultModel.getFaultById(faultId);
};

// Update a fault's status and create a history record
exports.updateFaultStatus = async (id, { status }, actor) => {
  if (!status) {
    throw new Error("Status is required");
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid status value");
  }

  const existingFault = await faultModel.getFaultById(id);
  const scope = await resolveUserScope(actor);

  if (!scope.actorId || !scope.role) {
    throw new Error("Not authorised");
  }

  if (!existingFault) {
    return null;
  }

  if (existingFault.bus_part_id) {
    const partContext = await fleetModel.getPartContextById(existingFault.bus_part_id);
    if (!canAccessPartContext(scope, partContext)) {
      throw new Error("Forbidden");
    }
  }

  const oldStatus = existingFault.status;

  await db.withTransaction(async (client) => {
    await faultModel.updateFaultStatus(id, status, client);

    await faultModel.createFaultUpdate({
      id: randomUUID(),
      issue_id: id,
      created_by: scope.actorId,
      update_type: "status_change",
      description: `Status changed from ${oldStatus} to ${status}`,
      status_from: oldStatus,
      status_to: status,
      new_issue_id: null
    }, client);

    if (existingFault.bus_part_id) {
      await fleetModel.reconcilePartConditionFromActiveIssues(existingFault.bus_part_id, client);
    }
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
exports.addFaultUpdate = async (id, body, actor) => {
  const {
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
  const scope = await resolveUserScope(actor);

  if (!scope.actorId || !scope.role) {
    throw new Error("Not authorised");
  }

  if (!fault) {
    return null;
  }

  if (fault.bus_part_id) {
    const partContext = await fleetModel.getPartContextById(fault.bus_part_id);
    if (!canAccessPartContext(scope, partContext)) {
      throw new Error("Forbidden");
    }
  }

  const updateId = randomUUID();

  await faultModel.createFaultUpdate({
    id: updateId,
    issue_id: id,
    created_by: scope.actorId,
    update_type,
    description,
    status_from: status_from || null,
    status_to: status_to || null,
    new_issue_id: new_issue_id || null
  });

  return await faultModel.getFaultUpdateById(updateId);
};