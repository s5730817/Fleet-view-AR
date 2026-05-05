const db = require("../database/db");

exports.getSummaryStats = async () => {
  const result = await db.query(
    `SELECT
      COUNT(*)::int AS created,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS completed,
      COUNT(*) FILTER (
        WHERE due_at IS NOT NULL
          AND due_at < NOW()
          AND status <> 'resolved'
      )::int AS overdue
     FROM issues`
  );

  return result.rows[0];
};

exports.getCreatedCountsByWeek = async () => {
  const result = await db.query(
    `SELECT
      date_trunc('week', created_at)::date AS week_start,
      COUNT(*)::int AS total
     FROM issues
     WHERE created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '3 weeks'
     GROUP BY 1
     ORDER BY 1 ASC`
  );

  return result.rows;
};

exports.getCompletedCountsByWeek = async () => {
  const result = await db.query(
    `SELECT
      date_trunc('week', resolved_at)::date AS week_start,
      COUNT(*)::int AS total
     FROM issues
     WHERE resolved_at IS NOT NULL
       AND resolved_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '3 weeks'
     GROUP BY 1
     ORDER BY 1 ASC`
  );

  return result.rows;
};

exports.getPriorityBreakdown = async () => {
  const result = await db.query(
    `SELECT
      COALESCE(priority, 'medium') AS priority,
      COUNT(*)::int AS total
     FROM issues
     GROUP BY 1
     ORDER BY 1 ASC`
  );

  return result.rows;
};

exports.getJobsByStatus = async () => {
  const result = await db.query(
    `SELECT
      status,
      COUNT(*)::int AS total
     FROM issues
     GROUP BY 1
     ORDER BY 1 ASC`
  );

  return result.rows;
};