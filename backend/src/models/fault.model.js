// This file contains all PostgreSQL queries for faults and fault updates.

const db = require("../database/db");

// Get summary data for dashboard
exports.getFaultSummary = async () => {
  const result = await db.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'reported')::int AS reported,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
      COUNT(*) FILTER (WHERE priority = 'high')::int AS high_priority,
      COUNT(*) FILTER (WHERE priority = 'medium')::int AS medium_priority,
      COUNT(*) FILTER (WHERE priority = 'low')::int AS low_priority
    FROM issues
  `);

  return result.rows[0];
};

// Get all faults with optional filters and sorting
exports.getAllFaults = async ({ status, priority, sort }) => {
  let query = `
    SELECT
      issues.id,
      issues.bus_part_id,
      issues.issue_type_id,
      issues.title,
      issues.description,
      issues.status,
      issues.priority,
      issues.created_at,
      issues.source,
      issues.updated_at,
      issue_types.code AS issue_type_code,
      issue_types.label AS issue_type_label,
      assignee.id AS assigned_to,
      assignee.name AS assigned_to_name
    FROM issues
    LEFT JOIN issue_types ON issue_types.id = issues.issue_type_id
    LEFT JOIN LATERAL (
      SELECT issue_assignments.user_id
      FROM issue_assignments
      WHERE issue_assignments.issue_id = issues.id
      ORDER BY issue_assignments.assigned_at DESC NULLS LAST, issue_assignments.id DESC
      LIMIT 1
    ) AS latest_assignment ON TRUE
    LEFT JOIN users AS assignee ON assignee.id = latest_assignment.user_id
  `;

  const queryParams = [];
  const conditions = [];

  // Add filters if they were provided
  if (status) {
    conditions.push(`status = $${queryParams.length + 1}`);
    queryParams.push(status);
  }

  if (priority) {
    conditions.push(`priority = $${queryParams.length + 1}`);
    queryParams.push(priority);
  }

  // Only add WHERE if at least one filter exists
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  // Sort by created date
  if (sort === "oldest") {
    query += " ORDER BY created_at ASC";
  } else {
    query += " ORDER BY created_at DESC";
  }

  const result = await db.query(query, queryParams);
  return result.rows;
};

// Get one fault by id
exports.getFaultById = async (id) => {
  const result = await db.query(
    `SELECT
      issues.*,
      issue_types.code AS issue_type_code,
      issue_types.label AS issue_type_label,
      assignee.id AS assigned_to,
      assignee.name AS assigned_to_name
     FROM issues
     LEFT JOIN issue_types ON issue_types.id = issues.issue_type_id
     LEFT JOIN LATERAL (
       SELECT issue_assignments.user_id
       FROM issue_assignments
       WHERE issue_assignments.issue_id = issues.id
       ORDER BY issue_assignments.assigned_at DESC NULLS LAST, issue_assignments.id DESC
       LIMIT 1
     ) AS latest_assignment ON TRUE
     LEFT JOIN users AS assignee ON assignee.id = latest_assignment.user_id
     WHERE issues.id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

// Create a new fault
exports.createFault = async ({ id, bus_part_id, issue_type_id, created_by, title, description, status, priority, source }, executor = db) => {
  await executor.query(
    `INSERT INTO issues (
      id,
      bus_part_id,
      issue_type_id,
      created_by,
      title,
      description,
      status,
      priority,
      source,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
    [id, bus_part_id, issue_type_id, created_by, title, description, status, priority, source]
  );
};

exports.createIssueAssignment = async ({ id, issue_id, user_id, assigned_at }, executor = db) => {
  await executor.query(
    `INSERT INTO issue_assignments (
      id,
      issue_id,
      user_id,
      assigned_at
    )
    VALUES ($1, $2, $3, $4)`,
    [id, issue_id, user_id, assigned_at]
  );
};

// Update a fault's status
exports.updateFaultStatus = async (id, status) => {
  await db.query(
    `UPDATE issues
     SET status = $1, updated_at = NOW()
     WHERE id = $2`,
    [status, id]
  );
};

// Create a history/update record
exports.createFaultUpdate = async ({
  id,
  issue_id,
  created_by,
  update_type,
  description,
  status_from,
  status_to,
  new_issue_id
}) => {
  await db.query(
    `INSERT INTO issue_updates (
      id,
      issue_id,
      created_at,
      created_by,
      update_type,
      description,
      status_from,
      status_to,
      new_issue_id
    )
    VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)`,
    [
      id,
      issue_id,
      created_by,
      update_type,
      description,
      status_from,
      status_to,
      new_issue_id
    ]
  );
};

// Get all updates for one fault
exports.getFaultUpdates = async (issueId) => {
  const result = await db.query(
    `SELECT
      id,
      issue_id,
      created_at,
      created_by,
      update_type,
      description,
      status_from,
      status_to,
      new_issue_id
     FROM issue_updates
     WHERE issue_id = $1
     ORDER BY created_at DESC`,
    [issueId]
  );

  return result.rows;
};

// Get one update by id
exports.getFaultUpdateById = async (updateId) => {
  const result = await db.query(
    "SELECT * FROM issue_updates WHERE id = $1",
    [updateId]
  );

  return result.rows[0] || null;
};