// This file handles HTTP requests and responses for fleet routes.

const { fleetService } = require("../services");

// GET all buses
exports.getAllBuses = async (req, res) => {
  try {
    const buses = await fleetService.getAllBuses();

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

// GET one bus by id
exports.getBusById = async (req, res) => {
  try {
    const bus = await fleetService.getBusById(req.params.id);

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

// GET bus-scoped AR context
exports.getBusARContext = async (req, res) => {
  try {
    const arContext = await fleetService.getARContext(req.params.id);

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
      req.body
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