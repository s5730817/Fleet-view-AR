// This file defines all job-related API routes.

const express = require("express");
const router = express.Router();
const jobController = require("../controllers/job.controller");

// GET jobs for the current user
router.get("/", jobController.getJobs);

module.exports = router;