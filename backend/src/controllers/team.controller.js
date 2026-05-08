// This file handles HTTP requests and responses for team routes.

const { teamService } = require("../services");

// GET all team members
exports.getTeamMembers = async (req, res) => {
  try {
    const teamMembers = await teamService.getTeamMembers(req.user);

    res.status(200).json({
      success: true,
      data: teamMembers,
    });
  } catch (err) {
    console.error("Error fetching team members:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch team members",
    });
  }
};