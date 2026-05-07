const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const faultRoutes = require("./routes/fault.route");
const authRoutes = require("./routes/auth.route");
const fleetRoutes = require("./routes/fleet.route");
const jobRoutes = require("./routes/job.route");
const summaryRoutes = require("./routes/summary.route");
const teamRoutes = require("./routes/team.route");
const { protect } = require("./middleware/auth.middleware");
const apiLimiter = require('./middleware/rateLimiter.middleware');

const app = express();

// Trust proxy (required if behind Nginx, Railway, Render, AWS, etc.)
//app.set('trust proxy', 1);

// Global middleware
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "500kb" }));
app.use(morgan("dev"));

// Rate limit all /api routes before anything else
app.use("/api/", apiLimiter);

// Auth routes (no protect needed)
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/faults", protect, faultRoutes);
app.use("/api/fleet", protect, fleetRoutes);
app.use("/api/jobs", protect, jobRoutes);
app.use("/api/summary", protect, summaryRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "AR Maintenance Backend is running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Global error handler (must be last, 4 params required)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
});

module.exports = app;