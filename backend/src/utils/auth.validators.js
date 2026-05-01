// This file stores simple validation helpers for auth.

exports.isValidEmail = (email) => {
  return typeof email === "string" && email.includes("@");
};

exports.allowedRoles = ["engineer", "manager", "admin"];