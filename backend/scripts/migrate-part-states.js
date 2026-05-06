const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

process.env.DATA_SOURCE = "postgres";

const db = require("../src/database/db");

const migrationStatements = [
  `ALTER TABLE bus_parts
     ADD COLUMN IF NOT EXISTS condition_state text`,
  `ALTER TABLE bus_parts
     ADD COLUMN IF NOT EXISTS lifecycle_state text`,
  `ALTER TABLE bus_parts
     ADD COLUMN IF NOT EXISTS last_inspected_at timestamp`,
  `CREATE TABLE IF NOT EXISTS part_lifecycle_policies (
     id uuid PRIMARY KEY,
     part_code text UNIQUE NOT NULL,
     usage_model text NOT NULL,
     expected_life_days int,
     expected_life_mileage int,
     inspection_interval_days int,
     replacement_rule text,
     created_at timestamp,
     updated_at timestamp
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS part_lifecycle_policies_part_code_idx
     ON part_lifecycle_policies (part_code)`,
  `UPDATE bus_parts
     SET condition_state = COALESCE(
           condition_state,
           CASE
             WHEN status = 'urgent' OR COALESCE(health_percent, 100) < 40 THEN 'repair_needed'
             WHEN status = 'due_soon' OR COALESCE(health_percent, 100) < 70 THEN 'watch'
             ELSE 'good'
           END
         ),
         lifecycle_state = COALESCE(
           lifecycle_state,
           CASE
             WHEN status = 'urgent' THEN 'beyond_expected_life'
             WHEN status = 'due_soon' THEN 'near_end_of_life'
             ELSE 'within_expected_life'
           END
         ),
         last_inspected_at = COALESCE(last_inspected_at, last_service_at, last_repair_at, NOW())`,
  `COMMENT ON COLUMN bus_parts.condition_state IS 'good | watch | repair_needed | replace_recommended'`,
  `COMMENT ON COLUMN bus_parts.lifecycle_state IS 'within_expected_life | near_end_of_life | beyond_expected_life | beyond_life_approved'`,
  `COMMENT ON COLUMN part_lifecycle_policies.usage_model IS 'days | mileage | issue_burden | inspection'`
];

const run = async () => {
  await db.withTransaction(async (client) => {
    for (const statement of migrationStatements) {
      await client.query(statement);
    }
  });

  console.log("Part state schema migration completed.");
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });