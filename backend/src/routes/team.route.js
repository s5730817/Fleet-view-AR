// This file defines all team routes.

const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");

// GET team members
router.get("/", teamController.getTeamMembers);

module.exports = router;