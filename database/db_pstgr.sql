CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY,
  "name" text UNIQUE NOT NULL
);

CREATE TABLE "depots" (
  "id" uuid PRIMARY KEY,
  "name" text NOT NULL,
  "location" text,
  "created_at" timestamp
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  "name" text NOT NULL,
  "email" text UNIQUE NOT NULL,
  "password_hash" text NOT NULL,
  "role_id" uuid,
  "depot_id" uuid,
  "created_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE "tool_types" (
  "id" uuid PRIMARY KEY,
  "name" text UNIQUE NOT NULL
);

CREATE TABLE "tools" (
  "id" uuid PRIMARY KEY,
  "depot_id" uuid,
  "tool_type_id" uuid,
  "marker_code" int,
  "status" text,
  "last_used_by" uuid,
  "last_used_at" timestamp
);

CREATE TABLE "buses" (
  "id" uuid PRIMARY KEY,
  "depot_id" uuid,
  "registration_number" text UNIQUE NOT NULL,
  "name" text,
  "model" text,
  "status" text,
  "mileage" int,
  "last_service_at" timestamp,
  "next_service_at" timestamp,
  "year" int
);

CREATE TABLE "bus_parts" (
  "id" uuid PRIMARY KEY,
  "bus_id" uuid,
  "name" text NOT NULL,
  "marker_code" int,
  "icon_key" text,
  "status" text,
  "health_percent" int,
  "last_repair_at" timestamp,
  "last_service_at" timestamp,
  "last_replacement_at" timestamp,
  "ar_instructions" jsonb
);

CREATE TABLE "issue_types" (
  "id" uuid PRIMARY KEY,
  "part_code" text NOT NULL,
  "code" text UNIQUE NOT NULL,
  "label" text NOT NULL,
  "summary" text,
  "default_priority" text,
  "recommended_action" text,
  "guide_title" text,
  "guide_steps" jsonb,
  "required_tool_types" jsonb,
  "created_at" timestamp
);

CREATE TABLE "issues" (
  "id" uuid PRIMARY KEY,
  "bus_part_id" uuid,
  "issue_type_id" uuid,
  "created_by" uuid,
  "title" text NOT NULL,
  "status" text,
  "priority" text,
  "description" text,
  "created_at" timestamp,
  "updated_at" timestamp,
  "due_at" timestamp,
  "approved_by" uuid,
  "approved_at" timestamp,
  "resolved_at" timestamp,
  "source" text
);

CREATE TABLE "issue_updates" (
  "id" uuid PRIMARY KEY,
  "issue_id" uuid NOT NULL,
  "created_at" timestamp,
  "created_by" uuid,
  "update_type" text NOT NULL,
  "description" text NOT NULL,
  "status_from" text,
  "status_to" text,
  "step_number" int,
  "new_issue_id" uuid,
  "metadata" jsonb
);

CREATE TABLE "maintenance_entries" (
  "id" uuid PRIMARY KEY,
  "bus_part_id" uuid NOT NULL,
  "user_id" uuid,
  "technician_name" text NOT NULL,
  "entry_type" text NOT NULL,
  "description" text NOT NULL,
  "notes" text,
  "created_at" timestamp
);

CREATE TABLE "issue_assignments" (
  "id" uuid PRIMARY KEY,
  "issue_id" uuid,
  "user_id" uuid,
  "assigned_at" timestamp
);

CREATE TABLE "issue_links" (
  "id" uuid PRIMARY KEY,
  "parent_issue_id" uuid,
  "child_issue_id" uuid
);

CREATE TABLE "repair_guides" (
  "id" uuid PRIMARY KEY,
  "bus_part_id" uuid,
  "title" text
);

CREATE TABLE "repair_steps" (
  "id" uuid PRIMARY KEY,
  "guide_id" uuid,
  "step_number" int,
  "instruction" text
);

CREATE TABLE "repair_guide_tool_types" (
  "id" uuid PRIMARY KEY,
  "guide_id" uuid,
  "tool_type_id" uuid
);

CREATE TABLE "issue_progress" (
  "id" uuid PRIMARY KEY,
  "issue_id" uuid,
  "current_step" int,
  "updated_by" uuid,
  "updated_at" timestamp,
  "completed_at" timestamp,
  "signed_off_by" uuid,
  "signed_off_at" timestamp
);

CREATE TABLE "comments" (
  "id" uuid PRIMARY KEY,
  "issue_id" uuid,
  "user_id" uuid,
  "content" text,
  "created_at" timestamp
);

CREATE TABLE "activity_logs" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid,
  "action" text,
  "entity_type" text,
  "entity_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp
);

CREATE UNIQUE INDEX ON "users" ("email");

CREATE INDEX ON "users" ("role_id");

CREATE INDEX ON "users" ("depot_id");

CREATE UNIQUE INDEX ON "tools" ("depot_id", "marker_code");

CREATE INDEX ON "tools" ("tool_type_id");

CREATE INDEX ON "buses" ("depot_id");

CREATE UNIQUE INDEX ON "buses" ("registration_number");

CREATE UNIQUE INDEX ON "bus_parts" ("bus_id", "marker_code");

CREATE INDEX ON "issue_types" ("part_code");

CREATE INDEX ON "issue_types" ("label");

CREATE INDEX ON "issues" ("bus_part_id");

CREATE INDEX ON "issues" ("issue_type_id");

CREATE INDEX ON "issues" ("status");

CREATE INDEX ON "issues" ("priority");

CREATE INDEX ON "issues" ("due_at");

CREATE INDEX ON "issue_updates" ("issue_id");

CREATE INDEX ON "issue_updates" ("created_by");

CREATE INDEX ON "issue_updates" ("update_type");

CREATE INDEX ON "maintenance_entries" ("bus_part_id");

CREATE INDEX ON "maintenance_entries" ("user_id");

CREATE INDEX ON "maintenance_entries" ("created_at");

CREATE INDEX ON "issue_assignments" ("issue_id");

CREATE INDEX ON "issue_assignments" ("user_id");

CREATE UNIQUE INDEX ON "issue_assignments" ("issue_id", "user_id");

CREATE INDEX ON "issue_links" ("parent_issue_id");

CREATE INDEX ON "issue_links" ("child_issue_id");

CREATE UNIQUE INDEX ON "issue_links" ("parent_issue_id", "child_issue_id");

CREATE UNIQUE INDEX ON "repair_guides" ("bus_part_id");

CREATE INDEX ON "repair_steps" ("guide_id");

CREATE UNIQUE INDEX ON "repair_steps" ("guide_id", "step_number");

CREATE INDEX ON "repair_guide_tool_types" ("guide_id");

CREATE INDEX ON "repair_guide_tool_types" ("tool_type_id");

CREATE UNIQUE INDEX ON "issue_progress" ("issue_id");

CREATE INDEX ON "comments" ("issue_id");

CREATE INDEX ON "comments" ("user_id");

CREATE INDEX ON "activity_logs" ("user_id");

CREATE INDEX ON "activity_logs" ("entity_type", "entity_id");

CREATE INDEX ON "activity_logs" ("created_at");

COMMENT ON COLUMN "tools"."status" IS 'available | in_use | awaiting_return';

COMMENT ON COLUMN "bus_parts"."status" IS 'good | due_soon | urgent';

COMMENT ON COLUMN "issue_types"."recommended_action" IS 'repair | replacement';

COMMENT ON COLUMN "issues"."status" IS 'reported | in_progress | awaiting_approval | resolved';

COMMENT ON COLUMN "issues"."priority" IS 'low | medium | high | critical';

COMMENT ON COLUMN "issue_updates"."update_type" IS 'comment | status_change | progress | sign_off | split';

COMMENT ON COLUMN "maintenance_entries"."entry_type" IS 'service | repair | replacement';

ALTER TABLE "users" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD FOREIGN KEY ("depot_id") REFERENCES "depots" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tools" ADD FOREIGN KEY ("depot_id") REFERENCES "depots" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tools" ADD FOREIGN KEY ("tool_type_id") REFERENCES "tool_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tools" ADD FOREIGN KEY ("last_used_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "buses" ADD FOREIGN KEY ("depot_id") REFERENCES "depots" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "bus_parts" ADD FOREIGN KEY ("bus_id") REFERENCES "buses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issues" ADD FOREIGN KEY ("bus_part_id") REFERENCES "bus_parts" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issues" ADD FOREIGN KEY ("issue_type_id") REFERENCES "issue_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issues" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issues" ADD FOREIGN KEY ("approved_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_updates" ADD FOREIGN KEY ("issue_id") REFERENCES "issues" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_updates" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_updates" ADD FOREIGN KEY ("new_issue_id") REFERENCES "issues" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "maintenance_entries" ADD FOREIGN KEY ("bus_part_id") REFERENCES "bus_parts" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "maintenance_entries" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_assignments" ADD FOREIGN KEY ("issue_id") REFERENCES "issues" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_assignments" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_links" ADD FOREIGN KEY ("parent_issue_id") REFERENCES "issues" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_links" ADD FOREIGN KEY ("child_issue_id") REFERENCES "issues" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "repair_guides" ADD FOREIGN KEY ("bus_part_id") REFERENCES "bus_parts" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "repair_steps" ADD FOREIGN KEY ("guide_id") REFERENCES "repair_guides" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "repair_guide_tool_types" ADD FOREIGN KEY ("guide_id") REFERENCES "repair_guides" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "repair_guide_tool_types" ADD FOREIGN KEY ("tool_type_id") REFERENCES "tool_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_progress" ADD FOREIGN KEY ("issue_id") REFERENCES "issues" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_progress" ADD FOREIGN KEY ("updated_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "issue_progress" ADD FOREIGN KEY ("signed_off_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comments" ADD FOREIGN KEY ("issue_id") REFERENCES "issues" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "comments" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "activity_logs" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
