// This file handles HTTP requests and responses for fleet routes.

const { fleetService } = require("../services");

// GET all buses
exports.getAllBuses = async (req, res) => {
  try {
    const buses = await fleetService.getAllBuses(req.user);

    res.status(200).json({
      success: true,
      count: buses.length,
      data: buses
    });
  } catch (err) {
    console.error("Error fetching fleet:", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};

exports.getMaintenanceAnomalies = async (req, res) => {
  try {
    const options = {
      recentWindowDays: req.query.recentWindowDays
          ? Number(req.query.recentWindowDays)
          : undefined,
      baselineWindowDays: req.query.baselineWindowDays
          ? Number(req.query.baselineWindowDays)
          : undefined,
      mediumRiskThreshold: req.query.mediumRiskThreshold
          ? Number(req.query.mediumRiskThreshold)
          : undefined,
      highRiskThreshold: req.query.highRiskThreshold
          ? Number(req.query.highRiskThreshold)
          : undefined,
    };

    Object.keys(options).forEach((key) => {
      if (options[key] === undefined || Number.isNaN(options[key])) {
        delete options[key];
      }
    });

    const anomalies = await fleetService.getMaintenanceAnomalies(
        req.user,
        options
    );

    res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      count: anomalies.length,
      data: anomalies
    });
  } catch (err) {
    console.error("Error detecting maintenance anomalies:", err);
    res.status(500).json({
      success: false,
      error: "Could not detect maintenance anomalies"
    });
  }
};

// GET one bus by id
exports.getBusById = async (req, res) => {
  try {
    const bus = await fleetService.getBusById(req.params.id, req.user);

    if (!bus) {
      return res.status(404).json({
        success: false,
        error: "Bus not found"
      });
    }

    res.status(200).json({
      success: true,
      data: bus
    });
  } catch (err) {
    console.error("Error fetching bus:", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};

exports.getARCatalog = async (req, res) => {
  try {
    const arCatalog = await fleetService.getARCatalog(req.user);

    res.status(200).json({
      success: true,
      data: arCatalog
    });
  } catch (err) {
    console.error("Error fetching AR catalog:", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};

exports.getBusARSnapshot = async (req, res) => {
  try {
    const arSnapshot = await fleetService.getARSnapshot(req.params.id, req.user);

    if (!arSnapshot) {
      return res.status(404).json({
        success: false,
        error: "Bus not found"
      });
    }

    res.status(200).json({
      success: true,
      data: arSnapshot
    });
  } catch (err) {
    console.error("Error fetching AR snapshot:", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};

// GET bus-scoped AR context
exports.getBusARContext = async (req, res) => {
  try {
    const arContext = await fleetService.getARContext(req.params.id, req.user);

    if (!arContext) {
      return res.status(404).json({
        success: false,
        error: "Bus not found"
      });
    }

    res.status(200).json({
      success: true,
      data: arContext
    });
  } catch (err) {
    console.error("Error fetching AR context:", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};

// CREATE a new maintenance entry for a component
exports.addMaintenanceEntry = async (req, res) => {
  try {
    const entry = await fleetService.addMaintenanceEntry(
        req.params.id,
        req.params.componentId,
        req.body,
        req.user
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: "Bus or component not found"
      });
    }

    res.status(201).json({
      success: true,
      message: "Maintenance entry added successfully",
      data: entry
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};