// This file defines all fault-related API routes.

const express = require("express");
const router = express.Router();
const faultController = require("../controllers/fault.controller");
const { authoriseRoles } = require("../middleware/role.middleware");

// GET dashboard summary for faults
router.get("/summary", faultController.getFaultSummary);

// GET all faults
router.get("/", faultController.getAllFaults);

// GET one fault by id
router.get("/:id", faultController.getFaultById);

// CREATE a new fault
router.post("/", authoriseRoles("engineer", "manager", "admin"), faultController.createFault);

// UPDATE a fault's status
router.patch("/:id/status", authoriseRoles("engineer", "manager", "admin"), faultController.updateFaultStatus);

// GET all updates for one fault
router.get("/:id/updates", faultController.getFaultUpdates);

// CREATE a new update for one fault
router.post("/:id/updates", authoriseRoles("engineer", "manager", "admin"), faultController.addFaultUpdate);

module.exports = router;