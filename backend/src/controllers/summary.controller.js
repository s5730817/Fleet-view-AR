// This file handles HTTP requests and responses for summary routes.

const { summaryService } = require("../services");

// GET summary dashboard data
exports.getSummary = async (req, res) => {
  try {
    const period = req.query.period || "week";
    const summary = await summaryService.getSummaryData(period, req.user);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error("Error fetching summary:", err);

    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};