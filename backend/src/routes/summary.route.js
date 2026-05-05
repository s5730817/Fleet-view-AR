// This file defines all summary-related API routes.

const express = require("express");
const router = express.Router();
const summaryController = require("../controllers/summary.controller");

// GET dashboard summary data
router.get("/", summaryController.getSummary);

module.exports = router;