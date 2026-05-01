// This file checks whether the authenticated user has the correct role for protected actions.

// Allow access only to users with one of the permitted roles
exports.authoriseRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: "Not authorised, user role missing"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Forbidden, insufficient role permissions"
      });
    }

    next();
  };
};