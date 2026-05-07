const { body, validationResult } = require("express-validator");

// Reusable handler to return validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// POST /faults
const validateCreateFault = [
  body("title").isString().notEmpty().withMessage("Title is required"),
  body("description").isString().notEmpty().withMessage("Description is required"),
  body("priority").isIn(["low", "medium", "high"]).withMessage("Priority must be low, medium or high"),
  body("bus_part_id").optional().isString(),
  body("issue_type_id").optional().isString(),
  body("created_by").optional().isString(),
  body("assigned_user_id").optional().isString(),
  body("source").optional().isString(),
  validate,
];

// PATCH /faults/:id/status
const validateUpdateFaultStatus = [
  body("status")
    .isIn(["reported", "in_progress", "awaiting_approval", "resolved"])
    .withMessage("Invalid status value"),
  body("created_by").optional({ nullable: true }).isString(),
  validate,
];

// POST /faults/:id/updates
const validateAddFaultUpdate = [
  body("update_type")
    .isIn(["comment", "status_change", "sign_off"])
    .withMessage("Invalid update_type value"),
  body("description").isString().notEmpty().withMessage("Description is required"),
  body("created_by").optional({ nullable: true }).isString(),
  body("status_from").optional({ nullable: true }).isString(),
  body("status_to").optional({ nullable: true }).isString(),
  validate,
];

module.exports = {
  validateCreateFault,
  validateUpdateFaultStatus,
  validateAddFaultUpdate,
};