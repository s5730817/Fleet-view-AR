const { randomUUID } = require("crypto");
const db = require("../database/db");

const ACTIVE_ISSUE_STATUSES = ["reported", "in_progress", "awaiting_approval"];

exports.getAllBuses = async ({ depotId = null } = {}) => {
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
     WHERE ($1::uuid IS NULL OR buses.depot_id = $1)
       ORDER BY name NULLS LAST, registration_number ASC`,
    [depotId]
  );

  return result.rows;
};

exports.getBusById = async (id, { depotId = null } = {}) => {
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
       WHERE buses.id = $1
         AND ($2::uuid IS NULL OR buses.depot_id = $2)`,
    [id, depotId]
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
      condition_state,
      lifecycle_state,
      last_repair_at,
      last_inspected_at,
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

exports.getPartContextById = async (partId) => {
  if (!partId) {
    return null;
  }

  const result = await db.query(
    `SELECT
      bus_parts.id,
      bus_parts.bus_id,
      buses.depot_id,
      depots.name AS depot_name,
      bus_parts.name,
      bus_parts.condition_state,
      bus_parts.lifecycle_state,
      bus_parts.last_repair_at,
      bus_parts.last_inspected_at,
      bus_parts.last_service_at,
      bus_parts.last_replacement_at,
      bus_parts.ar_instructions,
      bus_parts.marker_code,
      bus_parts.icon_key
     FROM bus_parts
     INNER JOIN buses ON buses.id = bus_parts.bus_id
     LEFT JOIN depots ON depots.id = buses.depot_id
     WHERE bus_parts.id = $1`,
    [partId]
  );

  return result.rows[0] || null;
};

exports.getLifecyclePoliciesForPartCodes = async (partCodes) => {
  const normalizedCodes = [...new Set(partCodes.filter(Boolean))];
  if (normalizedCodes.length === 0) {
    return [];
  }

  const result = await db.query(
    `SELECT
      part_code,
      usage_model,
      expected_life_days,
      expected_life_mileage,
      inspection_interval_days,
      replacement_rule
     FROM part_lifecycle_policies
     WHERE part_code = ANY($1::text[])`,
    [normalizedCodes]
  );

  return result.rows;
};

exports.updatePartLifecycleAfterMaintenance = async (partId, entryType, executor = db) => {
  if (!partId || !entryType) {
    return null;
  }

  const updateByType = {
    service: {
      condition_state: "good",
      lifecycle_state: null,
      timestampColumn: "last_service_at",
      inspected: true
    },
    repair: {
      condition_state: "good",
      lifecycle_state: null,
      timestampColumn: "last_repair_at",
      inspected: true
    },
    replacement: {
      condition_state: "good",
      lifecycle_state: "within_expected_life",
      timestampColumn: "last_replacement_at",
      inspected: true
    }
  };

  const update = updateByType[entryType];
  if (!update) {
    return null;
  }

  const fields = [
    `condition_state = $1`,
    `${update.timestampColumn} = NOW()`,
    `last_inspected_at = NOW()`
  ];
  const values = [update.condition_state];

  if (update.lifecycle_state !== null) {
    fields.push(`lifecycle_state = $${values.length + 1}`);
    values.push(update.lifecycle_state);
  }

  values.push(partId);

  await executor.query(
    `UPDATE bus_parts
     SET ${fields.join(", ")}
     WHERE id = $${values.length}`,
    values
  );

  return true;
};

exports.updatePartConditionFromIssue = async (partId, recommendedAction, executor = db) => {
  if (!partId) {
    return null;
  }

  const nextConditionState = recommendedAction === "replacement"
    ? "replace_recommended"
    : "repair_needed";
  const fields = [`condition_state = $1`];
  const values = [nextConditionState];

  values.push(partId);

  await executor.query(
    `UPDATE bus_parts
     SET ${fields.join(", ")}
     WHERE id = $${values.length}`,
    values
  );

  return true;
};

exports.reconcilePartConditionFromActiveIssues = async (partId, executor = db) => {
  if (!partId) {
    return null;
  }

  const [partResult, issueResult] = await Promise.all([
    executor.query(
      `SELECT condition_state
       FROM bus_parts
       WHERE id = $1`,
      [partId]
    ),
    executor.query(
      `SELECT issue_types.recommended_action
       FROM issues
       LEFT JOIN issue_types ON issue_types.id = issues.issue_type_id
       WHERE issues.bus_part_id = $1
         AND issues.status = ANY($2::text[])`,
      [partId, ACTIVE_ISSUE_STATUSES]
    )
  ]);

  const currentConditionState = partResult.rows[0]?.condition_state || "good";
  const hasActiveIssues = issueResult.rows.length > 0;
  const nextConditionState = hasActiveIssues
    ? issueResult.rows.some((issue) => issue.recommended_action === "replacement")
      ? "replace_recommended"
      : "repair_needed"
    : ACTIVE_ISSUE_STATUSES.includes(currentConditionState)
      ? currentConditionState
      : ["repair_needed", "replace_recommended"].includes(currentConditionState)
        ? "good"
        : currentConditionState;

  await executor.query(
    `UPDATE bus_parts
     SET condition_state = $1
     WHERE id = $2`,
    [nextConditionState, partId]
  );

  return nextConditionState;
};

exports.resolveActiveIssuesForPart = async ({ partId, createdBy, note, issueIds, approvedBy = null }, executor = db) => {
  if (!partId) {
    return [];
  }

  const normalizedIssueIds = Array.isArray(issueIds)
    ? [...new Set(issueIds.filter(Boolean))]
    : [];
  const queryParams = [partId, ACTIVE_ISSUE_STATUSES, approvedBy];
  const issueFilter = normalizedIssueIds.length > 0
    ? ` AND id = ANY($4::uuid[])`
    : "";

  if (normalizedIssueIds.length > 0) {
    queryParams.push(normalizedIssueIds);
  }

  const result = await executor.query(
    `WITH active_issues AS (
       SELECT id, title, status
       FROM issues
       WHERE bus_part_id = $1
         AND status = ANY($2::text[])
         ${issueFilter}
     )
     UPDATE issues AS current_issue
     SET status = 'resolved',
       approved_by = COALESCE($3::uuid, current_issue.approved_by),
       approved_at = CASE WHEN $3::uuid IS NOT NULL THEN NOW() ELSE current_issue.approved_at END,
         resolved_at = NOW(),
         updated_at = NOW()
     FROM active_issues
     WHERE current_issue.id = active_issues.id
     RETURNING current_issue.id, active_issues.title, active_issues.status`,
    queryParams
  );

  for (const issue of result.rows) {
    await executor.query(
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
      VALUES ($1, $2, NOW(), $3, 'status_change', $4, $5, 'resolved', NULL)`,
      [
        randomUUID(),
        issue.id,
        createdBy || null,
        note || `Issue resolved through maintenance on ${issue.title || "component"}`,
        issue.status
      ]
    );
  }

  return result.rows;
};

exports.markIssuesAwaitingApproval = async ({ partId, createdBy, note, issueIds, metadata = null }, executor = db) => {
  const normalizedIssueIds = Array.isArray(issueIds)
    ? [...new Set(issueIds.filter(Boolean))]
    : [];

  if (normalizedIssueIds.length === 0) {
    return [];
  }

  const result = await executor.query(
    `WITH candidate_issues AS (
       SELECT id, title, status
       FROM issues
       WHERE bus_part_id = $1
         AND id = ANY($2::uuid[])
         AND status = ANY($3::text[])
     )
     UPDATE issues AS current_issue
     SET status = 'awaiting_approval',
         resolved_at = NULL,
         updated_at = NOW()
     FROM candidate_issues
     WHERE current_issue.id = candidate_issues.id
     RETURNING current_issue.id, candidate_issues.title, candidate_issues.status`,
    [partId, normalizedIssueIds, ACTIVE_ISSUE_STATUSES]
  );

  for (const issue of result.rows) {
    await executor.query(
      `INSERT INTO issue_updates (
        id,
        issue_id,
        created_at,
        created_by,
        update_type,
        description,
        status_from,
        status_to,
        new_issue_id,
        metadata
      )
      VALUES ($1, $2, NOW(), $3, 'status_change', $4, $5, 'awaiting_approval', NULL, $6)`,
      [
        randomUUID(),
        issue.id,
        createdBy || null,
        note || `Manager approval requested for maintenance on ${issue.title || "component"}`,
        issue.status,
        metadata,
      ]
    );

    await executor.query(
      `INSERT INTO issue_updates (
        id,
        issue_id,
        created_at,
        created_by,
        update_type,
        description,
        status_from,
        status_to,
        new_issue_id,
        metadata
      )
      VALUES ($1, $2, NOW(), $3, 'comment', $4, NULL, NULL, NULL, $5)`,
      [
        randomUUID(),
        issue.id,
        createdBy || null,
        note || `Manager approval requested for maintenance on ${issue.title || "component"}`,
        metadata,
      ]
    );
  }

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
      issue_types.inspection_step AS issue_type_inspection_step,
      issue_types.default_priority AS issue_type_default_priority,
      issue_types.recommended_action AS issue_type_recommended_action,
      issue_types.guide_title AS issue_type_guide_title,
      issue_types.guide_steps AS issue_type_guide_steps,
      issue_types.required_tool_types AS issue_type_required_tool_types,
      assignee.id AS assigned_to,
      assignee.name AS assigned_to_name,
      assignee.email AS assigned_to_email,
      assignee_role.name AS assigned_to_role,
      latest_comment.description AS latest_comment,
      latest_approval_request.metadata AS maintenance_approval_metadata,
      latest_approval_request.status_from AS maintenance_approval_status_from
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
     LEFT JOIN LATERAL (
       SELECT metadata, status_from
       FROM issue_updates
       WHERE issue_updates.issue_id = issues.id
         AND issue_updates.metadata ->> 'kind' = 'maintenance_approval_request'
       ORDER BY issue_updates.created_at DESC
       LIMIT 1
     ) AS latest_approval_request ON TRUE
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
      inspection_step,
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

exports.getAssignableUsersForDepot = async (depotId = null) => {
  const result = await db.query(
    `SELECT
      users.id,
      users.name,
      users.email,
      roles.name AS role
     FROM users
     LEFT JOIN roles ON roles.id = users.role_id
     WHERE users.deleted_at IS NULL
       AND roles.name IN ('engineer', 'manager', 'admin')
       AND ($1::uuid IS NULL OR users.depot_id = $1)
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
}, executor = db) => {
  const result = await executor.query(
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