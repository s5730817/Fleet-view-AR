const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const authModel = require("../models/auth.model");
const { isValidEmail, allowedRoles } = require("../utils/auth.validators");

// ── 2FA TEMP STORAGE ─────────────────────────────────────────────
let pending2FA = [];

// Register a new user
exports.registerUser = async ({ name, email, password, role }) => {
  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (!isValidEmail(email)) throw new Error("Invalid email");
  if (!password) throw new Error("Password is required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");

  const finalRole = role || "engineer";
  if (!allowedRoles.includes(finalRole)) throw new Error("Invalid role");

  const existingUser = await authModel.getUserByEmail(email);
  if (existingUser) throw new Error("Email already in use");

  const password_hash = await bcrypt.hash(password, 10);
  const userId = randomUUID();

  await authModel.createUser({
    id: userId,
    name,
    email,
    password_hash,
    role: finalRole,
  });

  return await authModel.getUserById(userId);
};

// Login an existing user (STEP 1: password check → generate 2FA)
exports.loginUser = async ({ email, password }) => {
  if (!email) throw new Error("Email is required");
  if (!password) throw new Error("Password is required");

  const user = await authModel.getUserByEmail(email);
  if (!user) throw new Error("Invalid email or password");

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) throw new Error("Invalid email or password");

  // TESTING ONLY: skip 2FA for manager@test.com when NODE_ENV=test
// Remove this block before deploying to production
if (process.env.NODE_ENV === "test" && email === "manager@test.com") {
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ── Generate 2FA code ─────────────────────────────────────────
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // TEMP: log instead of sending email — replace with nodemailer/SendGrid in production
  console.log(`🔐 2FA code for ${email}: ${code}`);

  // Remove any previous codes for this user
  pending2FA = pending2FA.filter((entry) => entry.email !== email);

  // Store code with 5 minute expiry
  pending2FA.push({
    email,
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return {
    requires2FA: true,
    email,
  };
};

// Verify 2FA (STEP 2: verify code → issue JWT)
exports.verify2FA = async ({ email, code }) => {
  if (!email) throw new Error("Email is required");
  if (!code) throw new Error("2FA code is required");

  const entry = pending2FA.find((e) => e.email === email);
  if (!entry) throw new Error("2FA session not found");

  if (Date.now() > entry.expiresAt) {
    pending2FA = pending2FA.filter((e) => e.email !== email);
    throw new Error("2FA code expired");
  }

  if (entry.code !== code) throw new Error("Invalid 2FA code");

  // Remove used code immediately
  pending2FA = pending2FA.filter((e) => e.email !== email);

  // Fetch fresh user from real DB
  const user = await authModel.getUserByEmail(email);
  if (!user) throw new Error("User not found");

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};