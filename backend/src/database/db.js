const mysql = require("mysql2/promise");
const { v4: uuidv4 } = require("uuid");

// Create a connection pool to MySQL
const pool = mysql.createPool({
  host: "localhost",
  user: "root",              // change if needed
  password: "your_password", // change this
  database: "your_database_name",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;