// This file contains all MySQL queries for authentication.

const pool = require("../database/db");

// Find one user by email
exports.getUserByEmail = async (email) => {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  return rows[0] || null;
};

// Find one user by id
exports.getUserById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
    [id]
  );

  return rows[0] || null;
};

// Create a new user
exports.createUser = async ({ id, name, email, password_hash, role }) => {
  await pool.query(
    `INSERT INTO users (
      id,
      name,
      email,
      password_hash,
      role,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, NOW())`,
    [id, name, email, password_hash, role]
  );
};