const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

process.env.DATA_SOURCE = "postgres";

const db = require("../src/database/db");

const tablesToTruncate = [
  "repair_guide_tool_types",
  "repair_steps",
  "repair_guides",
  "issue_assignments",
  "maintenance_entries",
  "issue_updates",
  "issues",
  "bus_parts",
  "part_types",
  "buses",
  "tools",
  "tool_types",
  "users",
  "depots",
  "issue_types",
  "part_lifecycle_policies",
  "roles"
];

const run = async () => {
  await db.query(`TRUNCATE TABLE ${tablesToTruncate.join(", ")} RESTART IDENTITY CASCADE`);
  await db.getPool().end();
  console.log(`Reset PostgreSQL demo data by truncating ${tablesToTruncate.length} tables.`);
};

run().catch(async (error) => {
  console.error(error);
  try {
    await db.getPool().end();
  } catch (closeError) {
    // Ignore cleanup errors.
  }
  process.exit(1);
});