// This file defines all authentication routes.

const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const authController = require("../controllers/auth.controller");

const loginRateLimiter = require("../middleware/loginRateLimit.middleware");

const CA_CERT_PATH = path.resolve(__dirname, "../../../frontend/ca.crt");

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

router.get("/device-ca", (req, res) => {
	if (!fs.existsSync(CA_CERT_PATH)) {
		return res.status(404).json({
			success: false,
			error: "Local CA certificate not found. Generate it first with npm run cert:dev in frontend/."
		});
	}

	res.download(CA_CERT_PATH, "transitlens-dev-ca.crt");
});

module.exports = router;