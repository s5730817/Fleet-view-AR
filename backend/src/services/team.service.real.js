const db = require("../database/db");
const authModel = require("../models/auth.model");

const roleLabels = {
  admin: "Admin",
  manager: "Manager",
  engineer: "Technician",
};

const resolveUserScope = async (user) => {
  const fallbackRole = typeof user?.role === "string" ? user.role.trim().toLowerCase() : null;

  if (!user?.id) {
    return {
      role: fallbackRole,
      depotId: null,
      restrictToDepot: fallbackRole !== "admin",
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
  };
};

exports.getTeamMembers = async (user) => {
  const scope = await resolveUserScope(user);
  if (scope.restrictToDepot && !scope.depotId) {
    return [];
  }

  const result = await db.query(
    `SELECT
      users.id,
      users.name,
      users.email,
      roles.name AS role,
      CASE WHEN EXISTS (
        SELECT 1
        FROM issue_assignments
        INNER JOIN issues ON issues.id = issue_assignments.issue_id
        INNER JOIN bus_parts ON bus_parts.id = issues.bus_part_id
        INNER JOIN buses ON buses.id = bus_parts.bus_id
        WHERE issue_assignments.user_id = users.id
          AND issues.status IN ('reported', 'in_progress', 'awaiting_approval')
          AND ($1::uuid IS NULL OR buses.depot_id = $1)
      ) THEN 'On Job' ELSE 'Active' END AS status
     FROM users
     LEFT JOIN roles ON roles.id = users.role_id
     WHERE roles.name IN ('engineer', 'manager', 'admin')
       AND ($1::uuid IS NULL OR users.depot_id = $1)
     ORDER BY
       CASE roles.name
         WHEN 'admin' THEN 1
         WHEN 'manager' THEN 2
         ELSE 3
       END,
       users.name ASC`,
    [scope.restrictToDepot ? scope.depotId : null]
  );

  return result.rows.map((member) => ({
    id: member.id,
    name: member.name,
    role: roleLabels[member.role] || "Technician",
    email: member.email,
    phone: "Not available",
    status: member.status,
  }));
};