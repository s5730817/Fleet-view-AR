// This file defines all fleet-related API routes.

const express = require("express");
const router = express.Router();
const fleetController = require("../controllers/fleet.controller");

// Import role middleware for permission checks
const { authoriseRoles } = require("../middleware/role.middleware");

// GET all buses in the fleet
// Accessible to any authenticated user (protected at app level)
router.get("/", fleetController.getAllBuses);

// GET one bus by id
// Accessible to any authenticated user
router.get("/:id", fleetController.getBusById);

// GET bus-specific AR context
router.get("/:id/ar-context", fleetController.getBusARContext);

// CREATE a new maintenance entry for a component
// Restricted to manager/admin roles only
router.post(
  "/:id/components/:componentId/history",
  authoriseRoles("manager", "admin"),
  fleetController.addMaintenanceEntry
);

module.exports = router;