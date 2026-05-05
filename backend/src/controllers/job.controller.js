// This file handles HTTP requests and responses for job routes.

const { jobService } = require("../services");

// GET jobs for the logged-in user
exports.getJobs = async (req, res) => {
  try {
    const jobs = await jobService.getJobsForUser(req.user);

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (err) {
    console.error("Error fetching jobs:", err);

    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};