const db = require("../database/db");

exports.getAllBuses = async () => {
  const result = await db.query(
    `SELECT
      buses.id,
      buses.name,
      buses.depot_id,
      depots.name AS depot_name,
      buses.registration_number,
      buses.status,
      buses.mileage,
      buses.last_service_at,
      buses.next_service_at,
      buses.year,
      buses.model
     FROM buses
     LEFT JOIN depots ON depots.id = buses.depot_id
     ORDER BY name NULLS LAST, registration_number ASC`
  );

  return result.rows;
};

exports.getBusById = async (id) => {
  const result = await db.query(
    `SELECT
      buses.id,
      buses.name,
      buses.depot_id,
      depots.name AS depot_name,
      buses.registration_number,
      buses.status,
      buses.mileage,
      buses.last_service_at,
      buses.next_service_at,
      buses.year,
      buses.model
     FROM buses
     LEFT JOIN depots ON depots.id = buses.depot_id
     WHERE buses.id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

exports.getPartsForBusIds = async (busIds) => {
  if (busIds.length === 0) {
    return [];
  }

  const result = await db.query(
    `SELECT
      id,
      bus_id,
      name,
      marker_code,
      icon_key,
      status,
      health_percent,
      last_repair_at,
      last_service_at,
      last_replacement_at,
      ar_instructions
     FROM bus_parts
     WHERE bus_id = ANY($1::uuid[])
     ORDER BY name ASC`,
    [busIds]
  );

  return result.rows;
};

exports.getIssuesForPartIds = async (partIds) => {
  if (partIds.length === 0) {
    return [];
  }

  const result = await db.query(
    `SELECT
      issues.id,
      issues.bus_part_id,
      issues.issue_type_id,
      issues.title,
      issues.status,
      issues.priority,
      issues.description,
      issues.created_at,
      issues.updated_at,
      issues.source,
      issue_types.code AS issue_type_code,
      issue_types.label AS issue_type_label,
      issue_types.summary AS issue_type_summary,
      issue_types.default_priority AS issue_type_default_priority,
      issue_types.recommended_action AS issue_type_recommended_action,
      issue_types.guide_title AS issue_type_guide_title,
      issue_types.guide_steps AS issue_type_guide_steps,
      issue_types.required_tool_types AS issue_type_required_tool_types,
      assignee.id AS assigned_to,
      assignee.name AS assigned_to_name,
      assignee.email AS assigned_to_email,
      assignee_role.name AS assigned_to_role,
      latest_comment.description AS latest_comment
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
     LEFT JOIN roles AS assignee_role ON assignee_role.id = assignee.role_id
     LEFT JOIN LATERAL (
       SELECT description
       FROM issue_updates
       WHERE issue_updates.issue_id = issues.id
         AND issue_updates.update_type = 'comment'
       ORDER BY issue_updates.created_at DESC
       LIMIT 1
     ) AS latest_comment ON TRUE
     WHERE issues.bus_part_id = ANY($1::uuid[])
     ORDER BY issues.created_at DESC`,
    [partIds]
  );

  return result.rows;
};

exports.getIssueTypesForPartCodes = async (partCodes) => {
  const normalizedCodes = [...new Set(partCodes.filter(Boolean))];
  if (normalizedCodes.length === 0) {
    return [];
  }

  const result = await db.query(
    `SELECT
      id,
      part_code,
      code,
      label,
      summary,
      default_priority,
      recommended_action,
      guide_title,
      guide_steps,
      required_tool_types
     FROM issue_types
     WHERE part_code = ANY($1::text[])
        OR part_code = 'generic'
     ORDER BY part_code ASC, label ASC`,
    [normalizedCodes]
  );

  return result.rows;
};

exports.getIssueHistoryForPartIds = async (partIds) => {
  if (partIds.length === 0) {
    return [];
  }

  const result = await db.query(
    `SELECT *
     FROM (
       SELECT
         CONCAT('issue:', issues.id) AS id,
         issues.bus_part_id,
         issues.created_at,
         'issue' AS history_type,
         COALESCE(creator.name, 'System') AS actor_name,
         CASE
           WHEN assignee.name IS NOT NULL THEN CONCAT('Issue logged: ', COALESCE(issue_types.label, issues.title), ' assigned to ', assignee.name)
           ELSE CONCAT('Issue logged: ', COALESCE(issue_types.label, issues.title))
         END AS description
       FROM issues
       LEFT JOIN issue_types ON issue_types.id = issues.issue_type_id
       LEFT JOIN users AS creator ON creator.id = issues.created_by
       LEFT JOIN LATERAL (
         SELECT users.name
         FROM issue_assignments
         LEFT JOIN users ON users.id = issue_assignments.user_id
         WHERE issue_assignments.issue_id = issues.id
         ORDER BY issue_assignments.assigned_at DESC NULLS LAST, issue_assignments.id DESC
         LIMIT 1
       ) AS assignee ON TRUE
       WHERE issues.bus_part_id = ANY($1::uuid[])

       UNION ALL

       SELECT
         CONCAT('update:', issue_updates.id) AS id,
         issues.bus_part_id,
         issue_updates.created_at,
         issue_updates.update_type AS history_type,
         COALESCE(update_user.name, 'System') AS actor_name,
         issue_updates.description AS description
       FROM issue_updates
       INNER JOIN issues ON issues.id = issue_updates.issue_id
       LEFT JOIN users AS update_user ON update_user.id = issue_updates.created_by
       WHERE issues.bus_part_id = ANY($1::uuid[])
     ) AS part_history
     ORDER BY created_at DESC`,
    [partIds]
  );

  return result.rows;
};

exports.getToolsForDepot = async (depotId) => {
  if (!depotId) {
    return [];
  }

  const result = await db.query(
    `SELECT
      tools.id,
      tools.marker_code,
      tools.status,
      tool_types.name AS tool_name,
      depots.name AS depot_name
     FROM tools
     LEFT JOIN tool_types ON tool_types.id = tools.tool_type_id
     LEFT JOIN depots ON depots.id = tools.depot_id
     WHERE tools.depot_id = $1
     ORDER BY tools.marker_code ASC`,
    [depotId]
  );

  return result.rows;
};

exports.getAssignableUsersForDepot = async (depotId) => {
  if (!depotId) {
    return [];
  }

  const result = await db.query(
    `SELECT
      users.id,
      users.name,
      users.email,
      roles.name AS role
     FROM users
     LEFT JOIN roles ON roles.id = users.role_id
     WHERE users.depot_id = $1
       AND users.deleted_at IS NULL
       AND roles.name IN ('engineer', 'manager', 'admin')
     ORDER BY
       CASE roles.name
         WHEN 'engineer' THEN 1
         WHEN 'manager' THEN 2
         ELSE 3
       END,
       users.name ASC`,
    [depotId]
  );

  return result.rows;
};

exports.getMaintenanceEntriesForPartIds = async (partIds) => {
  if (partIds.length === 0) {
    return [];
  }

  const result = await db.query(
    `SELECT
      maintenance_entries.id,
      maintenance_entries.bus_part_id,
      maintenance_entries.created_at,
      maintenance_entries.entry_type,
      maintenance_entries.description,
      maintenance_entries.notes,
      COALESCE(users.name, maintenance_entries.technician_name) AS technician
     FROM maintenance_entries
     LEFT JOIN users ON users.id = maintenance_entries.user_id
     WHERE maintenance_entries.bus_part_id = ANY($1::uuid[])
     ORDER BY maintenance_entries.created_at DESC`,
    [partIds]
  );

  return result.rows;
};

exports.createMaintenanceEntry = async ({
  id,
  bus_part_id,
  user_id,
  technician_name,
  entry_type,
  description,
  notes
}) => {
  const result = await db.query(
    `INSERT INTO maintenance_entries (
      id,
      bus_part_id,
      user_id,
      technician_name,
      entry_type,
      description,
      notes,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id, bus_part_id, created_at, entry_type, description, notes, technician_name`,
    [id, bus_part_id, user_id, technician_name, entry_type, description, notes]
  );

  return result.rows[0];
};