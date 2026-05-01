// This file contains temporary mock auth logic until the database is ready.

console.log("MOCK auth.service.js loaded");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

// Temporary in-memory users list with a default admin user
let mockUsers = [
  {
    id: "admin-1",
    name: "admin",
    email: "admin@test.com",
    password_hash: bcrypt.hashSync("password123", 10), // default password
    role: "admin",
    created_at: new Date().toISOString()
  }
];

// Register a new user
exports.registerUser = async (userData) => {
  if (!userData) {
    throw new Error("Request body is required");
  }

  const { name, email, password, role } = userData;

  if (!name) {
    throw new Error("Name is required");
  }

  if (!email) {
    throw new Error("Email is required");
  }

  if (!password) {
    throw new Error("Password is required");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Check if email already exists
  const existingUser = mockUsers.find((user) => user.email === email);

  if (existingUser) {
    throw new Error("Email already in use");
  }

  // Hash password before storing it
  const password_hash = await bcrypt.hash(password, 10);

  const newUser = {
    id: randomUUID(),
    name,
    email,
    password_hash,
    role: role || "engineer",
    created_at: new Date().toISOString()
  };

  mockUsers.push(newUser);

  // Return safe user data only
  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    created_at: newUser.created_at
  };
};

// Login an existing user
exports.loginUser = async (loginData) => {
  if (!loginData) {
    throw new Error("Request body is required");
  }

  const { email, password } = loginData;

  if (!email) {
    throw new Error("Email is required");
  }

  if (!password) {
    throw new Error("Password is required");
  }

  // Find user by email
  const user = mockUsers.find((user) => user.email === email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Compare password with stored hash
  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

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