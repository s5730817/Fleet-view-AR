// This file contains all MySQL queries for faults and fault updates. Will change this if we move to PostgreSQL.

const pool = require("../database/db");

// Get summary data for dashboard
exports.getFaultSummary = async () => {
  const [rows] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'reported' THEN 1 ELSE 0 END) AS reported,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high_priority,
      SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS medium_priority,
      SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS low_priority
    FROM issues
  `);

  return rows[0];
};

// Get all faults with optional filters and sorting
exports.getAllFaults = async ({ status, priority, sort }) => {
  let query = `
    SELECT
      id,
      title,
      description,
      status,
      priority,
      created_at,
      updated_at
    FROM issues
  `;

  const queryParams = [];
  const conditions = [];

  // Add filters if they were provided
  if (status) {
    conditions.push("status = ?");
    queryParams.push(status);
  }

  if (priority) {
    conditions.push("priority = ?");
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

  const [rows] = await pool.query(query, queryParams);
  return rows;
};

// Get one fault by id
exports.getFaultById = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM issues WHERE id = ?",
    [id]
  );

  return rows[0] || null;
};

// Create a new fault
exports.createFault = async ({ id, title, description, status, priority }) => {
  await pool.query(
    `INSERT INTO issues (
      id,
      title,
      description,
      status,
      priority,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [id, title, description, status, priority]
  );
};

// Update a fault's status
exports.updateFaultStatus = async (id, status) => {
  await pool.query(
    `UPDATE issues
     SET status = ?, updated_at = NOW()
     WHERE id = ?`,
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
  await pool.query(
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
    VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
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
  const [rows] = await pool.query(
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
     WHERE issue_id = ?
     ORDER BY created_at DESC`,
    [issueId]
  );

  return rows;
};

// Get one update by id
exports.getFaultUpdateById = async (updateId) => {
  const [rows] = await pool.query(
    "SELECT * FROM issue_updates WHERE id = ?",
    [updateId]
  );

  return rows[0] || null;
};