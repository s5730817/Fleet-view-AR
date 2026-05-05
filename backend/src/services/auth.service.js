// This file contains temporary mock auth logic until the database is ready.

console.log("MOCK auth.service.js loaded");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

// Temporary in-memory users list with default users
let mockUsers = [
  {
    id: "admin-1",
    name: "Admin",
    email: "admin@test.com",
    password_hash: bcrypt.hashSync("password123", 10),
    role: "admin",
    created_at: new Date().toISOString()
  },
  {
    id: "manager-1",
    name: "Manager",
    email: "manager@test.com",
    password_hash: bcrypt.hashSync("password123", 10),
    role: "manager",
    created_at: new Date().toISOString()
  },
  {
    id: "tech-1",
    name: "Tech 1",
    email: "tech1@test.com",
    password_hash: bcrypt.hashSync("password123", 10),
    role: "user",
    created_at: new Date().toISOString()
  },
  {
    id: "tech-2",
    name: "Tech 2",
    email: "tech2@test.com",
    password_hash: bcrypt.hashSync("password123", 10),
    role: "user",
    created_at: new Date().toISOString()
  }
];

// ── 2FA TEMP STORAGE ─────────────────────────────────────────────
// Stores active 2FA codes until verified or expired
let pending2FA = [];

// Register a new user
exports.registerUser = async (userData) => {
  if (!userData) {
    throw new Error("Request body is required");
  }

  const { name, email, password, role } = userData;

  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (!password) throw new Error("Password is required");

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const existingUser = mockUsers.find((user) => user.email === email);
  if (existingUser) throw new Error("Email already in use");

  const password_hash = await bcrypt.hash(password, 10);

  const newUser = {
    id: randomUUID(),
    name,
    email,
    password_hash,
    role: role || "user",
    created_at: new Date().toISOString()
  };

  mockUsers.push(newUser);

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    created_at: newUser.created_at
  };
};

// Login an existing user (STEP 1: password check → generate 2FA)
exports.loginUser = async (loginData) => {
  if (!loginData) throw new Error("Request body is required");

  const { email, password } = loginData;

  if (!email) throw new Error("Email is required");
  if (!password) throw new Error("Password is required");

  const user = mockUsers.find((user) => user.email === email);
  if (!user) throw new Error("Invalid email or password");

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) throw new Error("Invalid email or password");

  // ── Generate 2FA code ─────────────────────────────────────────
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // TEMP: log instead of sending email
  console.log(`🔐 2FA code for ${email}: ${code}`);

  // Remove any previous codes for this user
  pending2FA = pending2FA.filter((entry) => entry.email !== email);

  // Store code with expiry (5 minutes)
  pending2FA.push({
    email,
    code,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  // Tell frontend 2FA is required
  return {
    requires2FA: true,
    email
  };
};

// Verify 2FA (STEP 2: issue token)
exports.verify2FA = async ({ email, code }) => {
  if (!email) throw new Error("Email is required");
  if (!code) throw new Error("2FA code is required");

  const entry = pending2FA.find((e) => e.email === email);

  if (!entry) throw new Error("2FA session not found");

  if (Date.now() > entry.expiresAt) {
    pending2FA = pending2FA.filter((e) => e.email !== email);
    throw new Error("2FA code expired");
  }

  if (entry.code !== code) {
    throw new Error("Invalid 2FA code");
  }

  // Remove used code
  pending2FA = pending2FA.filter((e) => e.email !== email);

  const user = mockUsers.find((u) => u.email === email);

  // Create token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || "dev_secret_key",
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};