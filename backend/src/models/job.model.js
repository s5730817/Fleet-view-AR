const db = require("../database/db");

exports.getJobs = async () => {
  const result = await db.query(
    `SELECT
      issues.id,
      buses.id AS bus_id,
      COALESCE(buses.name, buses.registration_number) AS bus_name,
      bus_parts.id AS component_id,
      bus_parts.name AS component_name,
      issues.title,
      issues.status,
      issues.priority,
      issue_assignments.user_id AS assigned_to,
      assignee.name AS assigned_to_name,
      issues.due_at,
      issues.created_at
     FROM issues
     INNER JOIN bus_parts ON bus_parts.id = issues.bus_part_id
     INNER JOIN buses ON buses.id = bus_parts.bus_id
        INNER JOIN issue_assignments ON issue_assignments.issue_id = issues.id
     LEFT JOIN users AS assignee ON assignee.id = issue_assignments.user_id
     ORDER BY issues.created_at DESC`
  );

  return result.rows;
};