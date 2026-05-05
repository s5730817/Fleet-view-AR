const path = require("path");
const bcrypt = require("bcrypt");
const { createHash } = require("crypto");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

process.env.DATA_SOURCE = "postgres";

const db = require("../src/database/db");
const fleetService = require("../src/services/fleet.service");
const jobService = require("../src/services/job.service");
const faultService = require("../src/services/fault.service");
const {
  getBusMarkerCode,
  getToolMarkerCode,
  getIssueCatalogEntries,
  getDefaultIssueTypeKeyForPart,
  resolvePartCode
} = require("../src/utils/arIssueCatalog");

const stableUuid = (seed) => {
  const hex = createHash("sha1").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const toTimestamp = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
};

const componentStatusMap = {
  Good: "good",
  "Due Soon": "due_soon",
  Urgent: "urgent"
};

const jobStatusOverrides = {
  "job-001": "in_progress",
  "job-002": "in_progress",
  "job-003": "awaiting_approval",
  "job-004": "reported",
  "job-005": "in_progress",
  "job-006": "resolved",
  "job-007": "in_progress",
  "job-008": "reported"
};

const jobCreatedBy = {
  "job-001": "manager@test.com",
  "job-002": "manager@test.com",
  "job-003": "manager@test.com",
  "job-004": "manager@test.com",
  "job-005": "manager@test.com",
  "job-006": "manager@test.com",
  "job-007": "manager@test.com",
  "job-008": "manager@test.com"
};

const updateUserMap = {
  engineer_1: "tech1@test.com",
  engineer_2: "tech2@test.com",
  engineer_3: "tech1@test.com",
  engineer_4: "tech2@test.com",
  system_user: "manager@test.com"
};

const partToolMap = {
  engine: ["Diagnostic Scanner", "Torque Wrench", "Wrench"],
  brakes: ["Brake Caliper Tool", "Torque Wrench", "Wrench"],
  tires: ["Hydraulic Jack", "Torque Wrench"],
  battery: ["Battery Tester", "Multimeter"],
  suspension: ["Hydraulic Jack", "Wrench"],
  cooling: ["Coolant Pressure Tester", "Diagnostic Scanner"],
  transmission: ["Diagnostic Scanner", "Torque Wrench"],
  electrical: ["Multimeter", "Diagnostic Scanner", "Drill"]
};

const toolTypeNames = [
  "Diagnostic Scanner",
  "Torque Wrench",
  "Wrench",
  "Drill",
  "Brake Caliper Tool",
  "Hydraulic Jack",
  "Battery Tester",
  "Coolant Pressure Tester",
  "Multimeter"
];

const users = [
  {
    seed: "user:admin",
    name: "Admin",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
    depotSeed: "depot:north"
  },
  {
    seed: "user:manager",
    name: "Manager",
    email: "manager@test.com",
    password: "password123",
    role: "manager",
    depotSeed: "depot:central"
  },
  {
    seed: "user:tech1",
    name: "Tech 1",
    email: "tech1@test.com",
    password: "password123",
    role: "engineer",
    depotSeed: "depot:central"
  },
  {
    seed: "user:tech2",
    name: "Tech 2",
    email: "tech2@test.com",
    password: "password123",
    role: "engineer",
    depotSeed: "depot:north"
  }
];

const depots = [
  {
    seed: "depot:central",
    name: "Central Depot",
    location: "City Centre"
  },
  {
    seed: "depot:north",
    name: "North Depot",
    location: "North Yard"
  }
];

const run = async () => {
  const fleet = await fleetService.getAllBuses();
  const jobs = await jobService.getJobsForUser({ id: "seed-admin", role: "admin" });
  const mockFaults = await faultService.getAllFaults({});

  const userIdByEmail = new Map();
  const roleIdByName = new Map();
  const depotIdBySeed = new Map();
  const busIdByLegacyId = new Map();
  const partIdByLegacyKey = new Map();
  const toolTypeIdByName = new Map();
  const issueTypeIdByKey = new Map();

  await db.withTransaction(async (client) => {
    await client.query(
      `DELETE FROM comments
       WHERE issue_id IN (
         SELECT id FROM issues WHERE title = 'DB smoke fault'
       )`
    );
    await client.query(
      `DELETE FROM issue_progress
       WHERE issue_id IN (
         SELECT id FROM issues WHERE title = 'DB smoke fault'
       )`
    );
    await client.query(
      `DELETE FROM issue_assignments
       WHERE issue_id IN (
         SELECT id FROM issues WHERE title = 'DB smoke fault'
       )`
    );
    await client.query(
      `DELETE FROM comments
       WHERE user_id IN (
         SELECT id FROM users WHERE email LIKE 'dbsmoke_%'
       )`
    );
    await client.query(
      `DELETE FROM issue_updates
       WHERE issue_id IN (
         SELECT id FROM issues WHERE title = 'DB smoke fault'
       )
          OR issue_id IN (
         SELECT id FROM issues WHERE source = 'db_smoke'
       )`
    );
    await client.query("DELETE FROM issues WHERE title = 'DB smoke fault'");
    await client.query("DELETE FROM issues WHERE source = 'db_smoke'");
    await client.query("DELETE FROM users WHERE email LIKE 'dbsmoke_%'");

    for (const roleName of ["admin", "manager", "engineer"]) {
      const roleId = stableUuid(`role:${roleName}`);
      const roleResult = await client.query(
        `INSERT INTO roles (id, name)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [roleId, roleName]
      );
      roleIdByName.set(roleName, roleResult.rows[0].id);
    }

    for (const depot of depots) {
      const depotId = stableUuid(depot.seed);
      depotIdBySeed.set(depot.seed, depotId);
      await client.query(
        `INSERT INTO depots (id, name, location, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             location = EXCLUDED.location`,
        [depotId, depot.name, depot.location]
      );
    }

    for (const user of users) {
      const userId = stableUuid(user.seed);
      const passwordHash = await bcrypt.hash(user.password, 10);
      userIdByEmail.set(user.email, userId);
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role_id, depot_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             email = EXCLUDED.email,
             password_hash = EXCLUDED.password_hash,
             role_id = EXCLUDED.role_id,
             depot_id = EXCLUDED.depot_id`,
        [
          userId,
          user.name,
          user.email,
          passwordHash,
          roleIdByName.get(user.role),
          depotIdBySeed.get(user.depotSeed)
        ]
      );
    }

    for (const toolTypeName of toolTypeNames) {
      const toolTypeId = stableUuid(`tool-type:${toolTypeName}`);
      toolTypeIdByName.set(toolTypeName, toolTypeId);
      await client.query(
        `INSERT INTO tool_types (id, name)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name`,
        [toolTypeId, toolTypeName]
      );
    }

    for (const issueType of getIssueCatalogEntries()) {
      const issueTypeId = stableUuid(`issue-type:${issueType.partCode}:${issueType.key}`);
      issueTypeIdByKey.set(`${issueType.partCode}:${issueType.key}`, issueTypeId);
      await client.query(
        `INSERT INTO issue_types (
          id,
          part_code,
          code,
          label,
          summary,
          default_priority,
          recommended_action,
          guide_title,
          guide_steps,
          required_tool_types,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, NOW())
        ON CONFLICT (code) DO UPDATE
        SET part_code = EXCLUDED.part_code,
            label = EXCLUDED.label,
            summary = EXCLUDED.summary,
            default_priority = EXCLUDED.default_priority,
            recommended_action = EXCLUDED.recommended_action,
            guide_title = EXCLUDED.guide_title,
            guide_steps = EXCLUDED.guide_steps,
            required_tool_types = EXCLUDED.required_tool_types`,
        [
          issueTypeId,
          issueType.partCode,
          issueType.key,
          issueType.label,
          issueType.summary,
          issueType.priority,
          issueType.recommendedAction,
          issueType.guideTitle,
          JSON.stringify(issueType.guideSteps),
          JSON.stringify(issueType.requiredToolTypes)
        ]
      );
    }

    for (const [depotIndex, depot] of depots.entries()) {
      for (const [toolIndex, toolTypeName] of toolTypeNames.entries()) {
        const toolId = stableUuid(`tool:${depot.seed}:${toolTypeName}`);
        await client.query(
          `INSERT INTO tools (id, depot_id, tool_type_id, marker_code, status, last_used_by, last_used_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE
           SET depot_id = EXCLUDED.depot_id,
               tool_type_id = EXCLUDED.tool_type_id,
               marker_code = EXCLUDED.marker_code,
               status = EXCLUDED.status,
               last_used_by = EXCLUDED.last_used_by,
               last_used_at = EXCLUDED.last_used_at`,
          [
            toolId,
            depotIdBySeed.get(depot.seed),
            toolTypeIdByName.get(toolTypeName),
            getToolMarkerCode(toolIndex),
            "available",
            null,
            null
          ]
        );
      }
    }

    for (const [index, bus] of fleet.entries()) {
      const legacyBusId = `bus-${String(index + 1).padStart(3, "0")}`;
      const busId = stableUuid(`bus:${legacyBusId}`);
      const depotSeed = index < 9 ? "depot:central" : "depot:north";
      busIdByLegacyId.set(legacyBusId, busId);

      await client.query(
        `INSERT INTO buses (
          id,
          depot_id,
          registration_number,
          name,
          model,
          status,
          mileage,
          last_service_at,
          next_service_at,
          year
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE
        SET depot_id = EXCLUDED.depot_id,
            registration_number = EXCLUDED.registration_number,
            name = EXCLUDED.name,
            model = EXCLUDED.model,
            status = EXCLUDED.status,
            mileage = EXCLUDED.mileage,
            last_service_at = EXCLUDED.last_service_at,
            next_service_at = EXCLUDED.next_service_at,
            year = EXCLUDED.year`,
        [
          busId,
          depotIdBySeed.get(depotSeed),
          bus.plateNumber,
          bus.name,
          bus.model,
          bus.status,
          bus.mileage,
          toTimestamp(bus.lastServiceDate),
          toTimestamp(bus.nextServiceDate),
          bus.year
        ]
      );

      for (const [componentIndex, component] of bus.components.entries()) {
        const partId = stableUuid(`part:${legacyBusId}:${component.id}`);
        const partKey = `${legacyBusId}:${component.id}`;
        const guideId = stableUuid(`guide:${partKey}`);
        partIdByLegacyKey.set(partKey, partId);

        await client.query(
          `INSERT INTO bus_parts (
            id,
            bus_id,
            name,
            marker_code,
            icon_key,
            status,
            health_percent,
            last_repair_at,
            last_service_at,
            last_replacement_at,
            ar_instructions
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET bus_id = EXCLUDED.bus_id,
              name = EXCLUDED.name,
              marker_code = EXCLUDED.marker_code,
              icon_key = EXCLUDED.icon_key,
              status = EXCLUDED.status,
              health_percent = EXCLUDED.health_percent,
              last_repair_at = EXCLUDED.last_repair_at,
              last_service_at = EXCLUDED.last_service_at,
              last_replacement_at = EXCLUDED.last_replacement_at,
              ar_instructions = EXCLUDED.ar_instructions`,
          [
            partId,
            busId,
            component.name,
            getBusMarkerCode(componentIndex),
            component.icon,
            componentStatusMap[component.status] || "good",
            component.healthPercent,
            toTimestamp(component.lastRepair),
            toTimestamp(component.lastService),
            toTimestamp(component.lastReplacement),
            JSON.stringify(component.arInstructions)
          ]
        );

        await client.query(
          `INSERT INTO repair_guides (id, bus_part_id, title)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE
           SET bus_part_id = EXCLUDED.bus_part_id,
               title = EXCLUDED.title`,
          [guideId, partId, `${component.name} Repair Guide`]
        );

        for (const [stepIndex, instruction] of component.arInstructions.entries()) {
          const stepId = stableUuid(`guide-step:${partKey}:${stepIndex + 1}`);
          await client.query(
            `INSERT INTO repair_steps (id, guide_id, step_number, instruction)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE
             SET guide_id = EXCLUDED.guide_id,
                 step_number = EXCLUDED.step_number,
                 instruction = EXCLUDED.instruction`,
            [stepId, guideId, stepIndex + 1, instruction]
          );
        }

        for (const toolTypeName of partToolMap[component.id] || ["Diagnostic Scanner"]) {
          const relationId = stableUuid(`guide-tool:${partKey}:${toolTypeName}`);
          await client.query(
            `INSERT INTO repair_guide_tool_types (id, guide_id, tool_type_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE
             SET guide_id = EXCLUDED.guide_id,
                 tool_type_id = EXCLUDED.tool_type_id`,
            [relationId, guideId, toolTypeIdByName.get(toolTypeName)]
          );
        }

        for (const historyEntry of component.history) {
          const entryId = stableUuid(`maintenance:${partKey}:${historyEntry.id}`);
          await client.query(
            `INSERT INTO maintenance_entries (
              id,
              bus_part_id,
              user_id,
              technician_name,
              entry_type,
              description,
              notes,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE
            SET bus_part_id = EXCLUDED.bus_part_id,
                user_id = EXCLUDED.user_id,
                technician_name = EXCLUDED.technician_name,
                entry_type = EXCLUDED.entry_type,
                description = EXCLUDED.description,
                notes = EXCLUDED.notes,
                created_at = EXCLUDED.created_at`,
            [
              entryId,
              partId,
              null,
              historyEntry.technician,
              historyEntry.type,
              historyEntry.description,
              historyEntry.notes || null,
              toTimestamp(historyEntry.date)
            ]
          );
        }
      }
    }

    for (const job of jobs) {
      const issueId = stableUuid(`issue:job:${job.id}`);
      const assignmentId = stableUuid(`assignment:${job.id}`);
      const commentUpdateId = stableUuid(`issue-update:${job.id}:assignment`);
      const partId = partIdByLegacyKey.get(`${job.busId}:${job.componentId}`);
      const assignedUserEmail = job.assignedTo === "tech-2" ? "tech2@test.com" : "tech1@test.com";
      const assignedUserId = userIdByEmail.get(assignedUserEmail);
      const createdById = userIdByEmail.get(jobCreatedBy[job.id]);
      const status = jobStatusOverrides[job.id] || "reported";
      const createdAt = toTimestamp(job.createdAt);
      const dueAt = toTimestamp(job.dueDate);
      const priority = job.urgency.toLowerCase();
      const issueTypeKey = getDefaultIssueTypeKeyForPart(job.componentId);
      const issueTypeId = issueTypeIdByKey.get(`${job.componentId}:${issueTypeKey}`);
      const signedOff = status === "awaiting_approval" || status === "resolved";
      const completedAt = status === "resolved" ? dueAt : null;
      const signOffAt = status === "awaiting_approval" ? dueAt : null;
      const currentStep = signedOff ? 5 : status === "in_progress" ? 2 : 0;

      await client.query(
        `INSERT INTO issues (
          id,
          bus_part_id,
          issue_type_id,
          created_by,
          title,
          status,
          priority,
          description,
          created_at,
          updated_at,
          due_at,
          approved_by,
          approved_at,
          resolved_at,
          source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, NULL, NULL, $11, 'seed_mock_job')
        ON CONFLICT (id) DO UPDATE
        SET bus_part_id = EXCLUDED.bus_part_id,
            issue_type_id = EXCLUDED.issue_type_id,
            created_by = EXCLUDED.created_by,
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            description = EXCLUDED.description,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            due_at = EXCLUDED.due_at,
            resolved_at = EXCLUDED.resolved_at,
            source = EXCLUDED.source`,
        [
          issueId,
          partId,
          issueTypeId,
          createdById,
          job.title,
          status,
          priority,
          `Seeded from mock job data for ${job.busName} / ${job.componentName}.`,
          createdAt,
          dueAt,
          completedAt
        ]
      );

      await client.query(
        `INSERT INTO issue_assignments (id, issue_id, user_id, assigned_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
         SET issue_id = EXCLUDED.issue_id,
             user_id = EXCLUDED.user_id,
             assigned_at = EXCLUDED.assigned_at`,
        [assignmentId, issueId, assignedUserId, createdAt]
      );

      await client.query(
        `INSERT INTO issue_updates (
          id,
          issue_id,
          created_at,
          created_by,
          update_type,
          description,
          status_from,
          status_to,
          step_number,
          new_issue_id,
          metadata
        )
        VALUES ($1, $2, $3, $4, 'comment', $5, NULL, NULL, NULL, NULL, $6::jsonb)
        ON CONFLICT (id) DO UPDATE
        SET issue_id = EXCLUDED.issue_id,
            created_at = EXCLUDED.created_at,
            created_by = EXCLUDED.created_by,
            description = EXCLUDED.description,
            metadata = EXCLUDED.metadata`,
        [
          commentUpdateId,
          issueId,
          createdAt,
          createdById,
          `Assigned to ${job.assignedToName} for ${job.componentName.toLowerCase()} work on ${job.busName}.`,
          JSON.stringify({ seededFrom: "mockJobs", legacyId: job.id })
        ]
      );

      if (status === "awaiting_approval") {
        const signOffUpdateId = stableUuid(`issue-update:${job.id}:signoff`);
        await client.query(
          `INSERT INTO issue_updates (
            id,
            issue_id,
            created_at,
            created_by,
            update_type,
            description,
            status_from,
            status_to,
            step_number,
            new_issue_id,
            metadata
          )
          VALUES ($1, $2, $3, $4, 'sign_off', $5, 'in_progress', 'awaiting_approval', 5, NULL, $6::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET description = EXCLUDED.description,
              status_from = EXCLUDED.status_from,
              status_to = EXCLUDED.status_to,
              metadata = EXCLUDED.metadata`,
          [
            signOffUpdateId,
            issueId,
            dueAt,
            assignedUserId,
            `Repair guide completed by ${job.assignedToName}; awaiting supervisor approval.`,
            JSON.stringify({ seededFrom: "mockJobs", legacyId: job.id })
          ]
        );
      }

      if (status === "resolved") {
        const resolutionUpdateId = stableUuid(`issue-update:${job.id}:resolved`);
        await client.query(
          `INSERT INTO issue_updates (
            id,
            issue_id,
            created_at,
            created_by,
            update_type,
            description,
            status_from,
            status_to,
            step_number,
            new_issue_id,
            metadata
          )
          VALUES ($1, $2, $3, $4, 'status_change', $5, 'in_progress', 'resolved', 5, NULL, $6::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET description = EXCLUDED.description,
              status_from = EXCLUDED.status_from,
              status_to = EXCLUDED.status_to,
              metadata = EXCLUDED.metadata`,
          [
            resolutionUpdateId,
            issueId,
            dueAt,
            assignedUserId,
            `${job.componentName} work completed and resolved.`,
            JSON.stringify({ seededFrom: "mockJobs", legacyId: job.id })
          ]
        );
      }

      await client.query(
        `INSERT INTO issue_progress (
          id,
          issue_id,
          current_step,
          updated_by,
          updated_at,
          completed_at,
          signed_off_by,
          signed_off_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE
        SET issue_id = EXCLUDED.issue_id,
            current_step = EXCLUDED.current_step,
            updated_by = EXCLUDED.updated_by,
            updated_at = EXCLUDED.updated_at,
            completed_at = EXCLUDED.completed_at,
            signed_off_by = EXCLUDED.signed_off_by,
            signed_off_at = EXCLUDED.signed_off_at`,
        [
          stableUuid(`progress:${job.id}`),
          issueId,
          currentStep,
          assignedUserId,
          signedOff ? dueAt : createdAt,
          completedAt,
          signOffAt ? assignedUserId : null,
          signOffAt
        ]
      );
    }

    const faultTargets = {
      "1": "bus-017:cooling",
      "2": "bus-004:engine"
    };

    for (const fault of mockFaults) {
      const issueId = stableUuid(`issue:fault:${fault.id}`);
      const targetKey = faultTargets[fault.id];
      const partId = partIdByLegacyKey.get(targetKey);
      const createdById = userIdByEmail.get("manager@test.com");
      const issueTypeKey = getDefaultIssueTypeKeyForPart(resolvePartCode(targetKey.split(":")[1]));
      const issueTypeId = issueTypeIdByKey.get(`${resolvePartCode(targetKey.split(":")[1])}:${issueTypeKey}`);
      const updates = await faultService.getFaultUpdates(fault.id);

      await client.query(
        `INSERT INTO issues (
          id,
          bus_part_id,
          issue_type_id,
          created_by,
          title,
          status,
          priority,
          description,
          created_at,
          updated_at,
          due_at,
          approved_by,
          approved_at,
          resolved_at,
          source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, NULL, NULL, NULL, NULL, 'seed_mock_fault')
        ON CONFLICT (id) DO UPDATE
        SET bus_part_id = EXCLUDED.bus_part_id,
            issue_type_id = EXCLUDED.issue_type_id,
            created_by = EXCLUDED.created_by,
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            description = EXCLUDED.description,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            source = EXCLUDED.source`,
        [
          issueId,
          partId,
          issueTypeId,
          createdById,
          fault.title,
          fault.status,
          fault.priority,
          fault.description || `Seeded from the mock fault dataset: ${fault.title}.`,
          toTimestamp(fault.created_at)
        ]
      );

      for (const update of updates) {
        const seededUserEmail = updateUserMap[update.created_by] || "manager@test.com";
        const seededUserId = userIdByEmail.get(seededUserEmail);
        await client.query(
          `INSERT INTO issue_updates (
            id,
            issue_id,
            created_at,
            created_by,
            update_type,
            description,
            status_from,
            status_to,
            step_number,
            new_issue_id,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL, $9::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET issue_id = EXCLUDED.issue_id,
              created_at = EXCLUDED.created_at,
              created_by = EXCLUDED.created_by,
              update_type = EXCLUDED.update_type,
              description = EXCLUDED.description,
              status_from = EXCLUDED.status_from,
              status_to = EXCLUDED.status_to,
              metadata = EXCLUDED.metadata`,
          [
            stableUuid(`issue-update:fault:${fault.id}:${update.id}`),
            issueId,
            toTimestamp(update.created_at),
            seededUserId,
            update.update_type,
            update.description,
            update.status_from,
            update.status_to,
            JSON.stringify({ seededFrom: "mockFaults", legacyIssueId: fault.id, legacyUpdateId: update.id })
          ]
        );

        if (update.update_type === "comment") {
          await client.query(
            `INSERT INTO comments (id, issue_id, user_id, content, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE
             SET issue_id = EXCLUDED.issue_id,
                 user_id = EXCLUDED.user_id,
                 content = EXCLUDED.content,
                 created_at = EXCLUDED.created_at`,
            [
              stableUuid(`comment:fault:${fault.id}:${update.id}`),
              issueId,
              seededUserId,
              update.description,
              toTimestamp(update.created_at)
            ]
          );
        }
      }
    }
  });

  await db.getPool().end();

  console.log(`Seeded ${fleet.length} buses, ${jobs.length} jobs, ${mockFaults.length} mock faults, and ${users.length} users into PostgreSQL.`);
};

run().catch(async (error) => {
  console.error(error);
  try {
    await db.getPool().end();
  } catch (closeError) {
    // Ignore close errors during failure cleanup.
  }
  process.exit(1);
});