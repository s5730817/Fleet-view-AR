// This file handles HTTP requests and responses for auth routes.

const authService = require("../services/auth.service");

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user
    });
  } catch (err) {
    console.error("Register error:", err);

    res.status(400).json({
      success: false,
      error: err.message || "Unknown error"
    });
  }
};

// Login an existing user
exports.loginUser = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (err) {
    console.error("Login error:", err);

    res.status(400).json({
      success: false,
      error: err.message || "Unknown error"
    });
  }
};

// Verify 2FA code (second step of login)
exports.verify2FA = async (req, res) => {
  try {
    const result = await authService.verify2FA(req.body);

    res.status(200).json({
      success: true,
      message: "2FA verification successful",
      data: result
    });
  } catch (err) {
    console.error("2FA error:", err);

    res.status(400).json({
      success: false,
      error: err.message || "Unknown error"
    });
  }
};