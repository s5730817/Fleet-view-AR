// This file defines all authentication routes.

const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");

const loginRateLimiter = require("../middleware/loginRateLimit.middleware");

// Register a new user
router.post("/register", authController.registerUser);

// Login an existing user
router.post(
  "/login",
  loginRateLimiter,
  authController.loginUser
);

// Verify 2FA code
router.post("/verify-2fa", authController.verify2FA);

module.exports = router;