// This file contains all PostgreSQL queries for authentication.

const { randomUUID } = require("crypto");
const db = require("../database/db");

const ensureRole = async (roleName) => {
  const result = await db.query(
    `INSERT INTO roles (id, name)
     VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [randomUUID(), roleName]
  );

  return result.rows[0].id;
};

// Find one user by email
exports.getUserByEmail = async (email) => {
  const result = await db.query(
    `SELECT
      users.id,
      users.name,
      users.email,
      users.password_hash,
      users.created_at,
      roles.name AS role
     FROM users
     LEFT JOIN roles ON roles.id = users.role_id
     WHERE LOWER(users.email) = LOWER($1)
       AND users.deleted_at IS NULL`,
    [email]
  );

  return result.rows[0] || null;
};

// Find one user by id
exports.getUserById = async (id) => {
  const result = await db.query(
    `SELECT
      users.id,
      users.name,
      users.email,
      roles.name AS role,
      users.created_at
     FROM users
     LEFT JOIN roles ON roles.id = users.role_id
     WHERE users.id = $1
       AND users.deleted_at IS NULL`,
    [id]
  );

  return result.rows[0] || null;
};

// Create a new user
exports.createUser = async ({ id, name, email, password_hash, role }) => {
  const roleId = await ensureRole(role);

  await db.query(
    `INSERT INTO users (
      id,
      name,
      email,
      password_hash,
      role_id,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())`,
    [id, name, email, password_hash, roleId]
  );
};