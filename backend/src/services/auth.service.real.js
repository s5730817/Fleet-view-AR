// This file contains the main auth logic.

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const authModel = require("../models/auth.model");
const { isValidEmail, allowedRoles } = require("../utils/auth.validators");

// Register a new user
exports.registerUser = async ({ name, email, password, role }) => {
  if (!name) {
    throw new Error("Name is required");
  }

  if (!email) {
    throw new Error("Email is required");
  }

  if (!isValidEmail(email)) {
    throw new Error("Invalid email");
  }

  if (!password) {
    throw new Error("Password is required");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const finalRole = role || "engineer";

  if (!allowedRoles.includes(finalRole)) {
    throw new Error("Invalid role");
  }

  const existingUser = await authModel.getUserByEmail(email);

  if (existingUser) {
    throw new Error("Email already in use");
  }

  // Hash the password before storing it
  const password_hash = await bcrypt.hash(password, 10);
  const userId = randomUUID();

  await authModel.createUser({
    id: userId,
    name,
    email,
    password_hash,
    role: finalRole
  });

  return await authModel.getUserById(userId);
};

// Login an existing user
exports.loginUser = async ({ email, password }) => {
  if (!email) {
    throw new Error("Email is required");
  }

  if (!password) {
    throw new Error("Password is required");
  }

  const user = await authModel.getUserByEmail(email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Compare the entered password with the stored hash
  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  // Create a JWT token for the user
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
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
      role: user.role
    }
  };
};