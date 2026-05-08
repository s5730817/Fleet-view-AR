const db = require("../database/db");

const periodIntervals = {
  week: { trunc: "day", interval: "6 days", groupFormat: "Dy" },
  month: { trunc: "week", interval: "1 month", groupFormat: "Week" },
  "3months": { trunc: "month", interval: "3 months", groupFormat: "Mon" },
  "6months": { trunc: "month", interval: "6 months", groupFormat: "Mon" },
  year: { trunc: "month", interval: "1 year", groupFormat: "Mon" },
};

const getPeriodConfig = (period = "week") => periodIntervals[period] || periodIntervals.week;

exports.getSummaryStats = async (period = "week") => {
  const { interval } = getPeriodConfig(period);
  const result = await db.query(
    `SELECT
      COUNT(*)::int AS created,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS completed,
      COUNT(*) FILTER (
        WHERE due_at IS NOT NULL
          AND due_at::date < CURRENT_DATE
          AND status <> 'resolved'
      )::int AS overdue
     FROM issues
     WHERE created_at >= CURRENT_DATE - $1::interval`,
    [interval]
  );
  return result.rows[0];
};

exports.getCreatedCountsByPeriod = async (period = "week") => {
  const { trunc, interval } = getPeriodConfig(period);
  const result = await db.query(
    `SELECT
      date_trunc($1, created_at)::date AS period_start,
      COUNT(*)::int AS total
     FROM issues
     WHERE created_at >= CURRENT_DATE - $2::interval
     GROUP BY 1
     ORDER BY 1 ASC`,
    [trunc, interval]
  );
  return result.rows;
};

exports.getCompletedCountsByPeriod = async (period = "week") => {
  const { trunc, interval } = getPeriodConfig(period);
  const result = await db.query(
    `SELECT
      date_trunc($1, resolved_at)::date AS period_start,
      COUNT(*)::int AS total
     FROM issues
     WHERE resolved_at IS NOT NULL
       AND resolved_at >= CURRENT_DATE - $2::interval
     GROUP BY 1
     ORDER BY 1 ASC`,
    [trunc, interval]
  );
  return result.rows;
};

exports.getJobsByStatus = async (period = "week") => {
  const { interval } = getPeriodConfig(period);
  const result = await db.query(
    `SELECT
      status,
      COUNT(*)::int AS total
     FROM issues
     WHERE created_at >= CURRENT_DATE - $1::interval
     GROUP BY 1
     ORDER BY 1 ASC`,
    [interval]
  );
  return result.rows;
};

exports.getFleetCondition = async () => {
  const result = await db.query(
    `SELECT
      status,
      COUNT(*)::int AS total
     FROM buses
     GROUP BY 1`
  );
  return result.rows;
};