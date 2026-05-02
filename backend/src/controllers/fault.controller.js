// This file handles HTTP requests and responses for fault routes.

const { faultService } = require("../services");

// GET dashboard summary for faults
exports.getFaultSummary = async (req, res) => {
  try {
    const summary = await faultService.getFaultSummary();

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error("Error fetching fault summary:", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};

// GET all faults
exports.getAllFaults = async (req, res) => {
  try {
    const faults = await faultService.getAllFaults(req.query);

    res.status(200).json({
      success: true,
      count: faults.length,
      data: faults
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// GET one fault by id
exports.getFaultById = async (req, res) => {
  try {
    const fault = await faultService.getFaultById(req.params.id);

    if (!fault) {
      return res.status(404).json({
        success: false,
        error: "Fault not found"
      });
    }

    res.status(200).json({
      success: true,
      data: fault
    });
  } catch (err) {
    console.error("Error fetching fault:", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};

// CREATE a new fault
exports.createFault = async (req, res) => {
  try {
    const newFault = await faultService.createFault(req.body);

    res.status(201).json({
      success: true,
      message: "Fault created successfully",
      data: newFault
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// UPDATE a fault's status
exports.updateFaultStatus = async (req, res) => {
  try {
    const updatedFault = await faultService.updateFaultStatus(
      req.params.id,
      req.body
    );

    if (!updatedFault) {
      return res.status(404).json({
        success: false,
        error: "Fault not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Fault status updated successfully",
      data: updatedFault
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// GET all updates for one fault
exports.getFaultUpdates = async (req, res) => {
  try {
    const updates = await faultService.getFaultUpdates(req.params.id);

    if (updates === null) {
      return res.status(404).json({
        success: false,
        error: "Fault not found"
      });
    }

    res.status(200).json({
      success: true,
      count: updates.length,
      data: updates
    });
  } catch (err) {
    console.error("Error fetching fault updates:", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
};

// CREATE a new update for one fault
exports.addFaultUpdate = async (req, res) => {
  try {
    const newUpdate = await faultService.addFaultUpdate(
      req.params.id,
      req.body
    );

    if (!newUpdate) {
      return res.status(404).json({
        success: false,
        error: "Fault not found"
      });
    }

    res.status(201).json({
      success: true,
      message: "Fault update added successfully",
      data: newUpdate
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};