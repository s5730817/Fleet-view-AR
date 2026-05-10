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

const getRelativeTimestamp = (offsetDays, hour = 9) => {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString();
};

const componentStatusMap = {
  Good: "good",
  "Due Soon": "good",
  Urgent: "repair_needed"
};

const componentLifecycleMap = {
  Good: "within_expected_life",
  "Due Soon": "near_end_of_life",
  Urgent: "beyond_expected_life"
};

const lifecyclePolicies = [
  { partCode: "engine", usageModel: "mileage", expectedLifeMileage: 250000, inspectionIntervalDays: 30, replacementRule: "Replace when repeated major failures occur or overhaul threshold is reached." },
  { partCode: "brakes", usageModel: "mileage", expectedLifeMileage: 60000, inspectionIntervalDays: 14, replacementRule: "Replace when wear limit is reached or braking performance drops below standard." },
  { partCode: "tires", usageModel: "mileage", expectedLifeMileage: 50000, inspectionIntervalDays: 14, replacementRule: "Replace when tread or sidewall condition fails inspection." },
  { partCode: "battery", usageModel: "days", expectedLifeDays: 1095, inspectionIntervalDays: 30, replacementRule: "Replace when test results fail or capacity drops below depot threshold." },
  { partCode: "suspension", usageModel: "inspection", inspectionIntervalDays: 30, replacementRule: "Replace when structural wear or leakage is confirmed." },
  { partCode: "cooling", usageModel: "inspection", inspectionIntervalDays: 30, replacementRule: "Replace when leak or thermal performance cannot be restored by repair." },
  { partCode: "transmission", usageModel: "mileage", expectedLifeMileage: 220000, inspectionIntervalDays: 30, replacementRule: "Replace or overhaul when recurring shift faults exceed repair threshold." },
  { partCode: "electrical", usageModel: "issue_burden", inspectionIntervalDays: 30, replacementRule: "Replace when recurring electrical faults continue after corrective work." }
];

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
    name: "Central Depot"
  },
  {
    seed: "depot:north",
    name: "North Depot"
  }
];

const showcaseToolStates = [
  {
    depotSeed: "depot:central",
    toolTypeName: "Diagnostic Scanner",
    status: "in_use",
    lastUsedByEmail: "tech1@test.com",
    lastUsedOffset: -1,
  },
  {
    depotSeed: "depot:central",
    toolTypeName: "Torque Wrench",
    status: "awaiting_return",
    lastUsedByEmail: "tech1@test.com",
    lastUsedOffset: -1,
  },
  {
    depotSeed: "depot:north",
    toolTypeName: "Coolant Pressure Tester",
    status: "in_use",
    lastUsedByEmail: "tech2@test.com",
    lastUsedOffset: -1,
  },
  {
    depotSeed: "depot:north",
    toolTypeName: "Multimeter",
    status: "awaiting_return",
    lastUsedByEmail: "tech2@test.com",
    lastUsedOffset: -2,
  }
];

const showcaseBusScenarios = [
  {
    seed: "showcase:good",
    registrationNumber: "DMO-100",
    name: "Showcase Good",
    depotSeed: "depot:central",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2024,
    mileage: 42000,
    lastServiceOffset: -18,
    nextServiceOffset: 24,
    partOverrides: {
      engine: {
        history: [
          {
            seed: "engine-service",
            type: "service",
            technicianEmail: "tech1@test.com",
            description: "Routine engine inspection completed with no findings.",
            dateOffset: -18,
          }
        ]
      },
      electrical: {
        history: [
          {
            seed: "lighting-repair-history",
            type: "repair",
            technicianEmail: "tech1@test.com",
            description: "Resolved historic lighting issue during depot inspection.",
            dateOffset: -35,
          }
        ],
        issues: [
          {
            seed: "lighting-history-only",
            title: "Historic lighting fault",
            status: "resolved",
            priority: "medium",
            preferredAction: "repair",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -36,
            resolvedOffset: -35,
            description: "Closed showcase fault kept for history coverage.",
            updates: [
              {
                seed: "lighting-history-comment",
                type: "comment",
                createdByEmail: "tech1@test.com",
                dateOffset: -35,
                description: "Lights tested and operating normally after connector cleanup.",
              },
              {
                seed: "lighting-history-resolved",
                type: "status_change",
                createdByEmail: "manager@test.com",
                dateOffset: -35,
                description: "Closed after validation.",
                statusFrom: "in_progress",
                statusTo: "resolved",
              }
            ],
            progress: {
              currentStep: 5,
              updatedByEmail: "tech1@test.com",
              updatedOffset: -35,
              completedOffset: -35,
            }
          }
        ]
      }
    }
  },
  {
    seed: "showcase:reports",
    registrationNumber: "DMO-101",
    name: "Showcase Open Reports",
    depotSeed: "depot:central",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2023,
    mileage: 61250,
    lastServiceOffset: -20,
    nextServiceOffset: 5,
    partOverrides: {
      battery: {
        issues: [
          {
            seed: "battery-open-report",
            title: "Battery terminal corrosion report",
            status: "reported",
            priority: "low",
            preferredAction: "repair",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -2,
            dueOffset: 5,
            description: "Visual corrosion found during yard inspection.",
            updates: [
              {
                seed: "battery-open-report-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -2,
                description: "Needs scheduled cleanup and retest.",
              }
            ]
          }
        ]
      },
      brakes: {
        lifecycleState: "near_end_of_life"
      },
      suspension: {
        lastInspectedOffset: -25
      }
    }
  },
  {
    seed: "showcase:approval",
    registrationNumber: "DMO-102",
    name: "Showcase Approval",
    depotSeed: "depot:central",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2022,
    mileage: 73840,
    lastServiceOffset: -28,
    nextServiceOffset: 0,
    partOverrides: {
      suspension: {
        lastInspectedOffset: -30,
        history: [
          {
            seed: "suspension-previous-service",
            type: "service",
            technicianEmail: "tech1@test.com",
            description: "Previous suspension inspection completed.",
            dateOffset: -30,
          }
        ]
      },
      cooling: {
        lastInspectedOffset: -36
      }
    }
  },
  {
    seed: "showcase:routine-overdue",
    registrationNumber: "DMO-103",
    name: "Showcase Routine Overdue",
    depotSeed: "depot:central",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2021,
    mileage: 103600,
    lastServiceOffset: -65,
    nextServiceOffset: -4,
    partOverrides: {
      engine: {
        history: [
          {
            seed: "routine-overdue-engine-service",
            type: "service",
            technicianEmail: "tech1@test.com",
            description: "Last routine service now intentionally overdue for demo.",
            dateOffset: -65,
          }
        ]
      }
    }
  },
  {
    seed: "showcase:blocking",
    registrationNumber: "DMO-104",
    name: "Showcase Blocking Faults",
    depotSeed: "depot:central",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2020,
    mileage: 148900,
    lastServiceOffset: -14,
    nextServiceOffset: 12,
    partOverrides: {
      engine: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "engine-blocking-report",
            title: "Engine oil pressure fault",
            status: "reported",
            priority: "high",
            preferredAction: "repair",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -1,
            dueOffset: 2,
            description: "Oil pressure warning remains active after startup.",
            updates: [
              {
                seed: "engine-blocking-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -1,
                description: "Hold this bus from release until the fault is cleared.",
              }
            ]
          }
        ]
      },
      electrical: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "electrical-blocking-report",
            title: "Exterior lights intermittent",
            status: "reported",
            priority: "medium",
            preferredAction: "repair",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -3,
            dueOffset: 4,
            description: "Front lights fail intermittently on route.",
            updates: [
              {
                seed: "electrical-blocking-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -3,
                description: "Logged after driver reported repeated lighting dropouts.",
              }
            ]
          }
        ]
      }
    }
  },
  {
    seed: "showcase:under-repair",
    registrationNumber: "DMO-105",
    name: "Showcase Under Repair",
    depotSeed: "depot:north",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2021,
    mileage: 131450,
    lastServiceOffset: -16,
    nextServiceOffset: 9,
    partOverrides: {
      engine: {
        conditionState: "repair_needed",
        history: [
          {
            seed: "engine-prev-repair",
            type: "repair",
            technicianEmail: "tech2@test.com",
            description: "Previous seal replacement completed during scheduled downtime.",
            dateOffset: -48,
          }
        ],
        issues: [
          {
            seed: "engine-in-progress",
            title: "Engine coolant leak repair",
            status: "in_progress",
            priority: "high",
            preferredAction: "repair",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -2,
            dueOffset: 1,
            description: "Coolant leak repair is underway in the north bay.",
            updates: [
              {
                seed: "engine-in-progress-comment",
                type: "comment",
                createdByEmail: "tech2@test.com",
                dateOffset: -2,
                description: "Repair started with a pressure test and hose inspection.",
              },
              {
                seed: "engine-in-progress-status",
                type: "status_change",
                createdByEmail: "tech2@test.com",
                dateOffset: -1,
                description: "Status changed from reported to in_progress.",
                statusFrom: "reported",
                statusTo: "in_progress",
              }
            ],
            progress: {
              currentStep: 2,
              updatedByEmail: "tech2@test.com",
              updatedOffset: -1,
            }
          }
        ]
      },
      cooling: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "cooling-awaiting-approval",
            title: "Cooling hose replacement awaiting approval",
            status: "awaiting_approval",
            priority: "medium",
            preferredAction: "repair",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -4,
            dueOffset: 0,
            description: "Repair completed and waiting for supervisor approval.",
            updates: [
              {
                seed: "cooling-awaiting-approval-comment",
                type: "comment",
                createdByEmail: "tech2@test.com",
                dateOffset: -3,
                description: "Hose replaced and cooling system repressurized.",
              },
              {
                seed: "cooling-awaiting-approval-signoff",
                type: "sign_off",
                createdByEmail: "tech2@test.com",
                dateOffset: -1,
                description: "Repair guide completed by Tech 2; awaiting supervisor approval.",
                statusFrom: "in_progress",
                statusTo: "awaiting_approval",
                stepNumber: 5,
              }
            ],
            progress: {
              currentStep: 5,
              updatedByEmail: "tech2@test.com",
              updatedOffset: -1,
              signedOffByEmail: "tech2@test.com",
              signedOffOffset: -1,
            }
          }
        ]
      },
      tires: {
        conditionState: "replace_recommended",
        lifecycleState: "beyond_expected_life",
        history: [
          {
            seed: "tires-previous-replacement",
            type: "replacement",
            technicianEmail: "tech2@test.com",
            description: "Previous tyre set replaced during winter service.",
            dateOffset: -120,
          }
        ],
        issues: [
          {
            seed: "tires-replacement-needed",
            title: "Tyre tread below threshold",
            status: "reported",
            priority: "high",
            preferredAction: "replacement",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -5,
            dueOffset: 2,
            description: "Replacement required before the next route release.",
            updates: [
              {
                seed: "tires-replacement-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -5,
                description: "Tread depth logged below depot safety threshold.",
              }
            ]
          }
        ]
      }
    }
  },
  {
    seed: "showcase:unscheduled",
    registrationNumber: "DMO-106",
    name: "Showcase Unscheduled Lifecycle",
    depotSeed: "depot:north",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2019,
    mileage: 167300,
    lastServiceOffset: -70,
    nextServiceOffset: null,
    partOverrides: {
      transmission: {
        lifecycleState: "beyond_expected_life",
        lastReplacementOffset: -850,
        history: [
          {
            seed: "transmission-replacement-history",
            type: "replacement",
            technicianEmail: "tech2@test.com",
            description: "Transmission module replaced in a previous overhaul.",
            dateOffset: -850,
          }
        ]
      },
      battery: {
        lifecycleState: "beyond_life_approved"
      }
    }
  },
  {
    seed: "showcase:issue-catalog",
    registrationNumber: "DMO-107",
    name: "Showcase Issue Catalog",
    depotSeed: "depot:central",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2022,
    mileage: 89400,
    lastServiceOffset: -22,
    nextServiceOffset: 8,
    partOverrides: {
      engine: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "catalog-engine-overheat",
            issueKey: "overheat",
            title: "Engine overheating under load",
            status: "reported",
            priority: "high",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -1,
            dueOffset: 3,
            description: "Temperature gauge repeatedly spiking on the A7 route.",
            updates: [
              {
                seed: "catalog-engine-overheat-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -1,
                description: "Driver flagged repeated thermal cutback on return journey."
              }
            ]
          }
        ]
      },
      brakes: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "catalog-brakes-sensor",
            issueKey: "sensor-fault",
            title: "ABS sensor dropout on front axle",
            status: "in_progress",
            priority: "medium",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -3,
            dueOffset: 2,
            description: "ABS warning active; front-left wheel speed signal intermittent.",
            updates: [
              {
                seed: "catalog-brakes-sensor-comment",
                type: "comment",
                createdByEmail: "tech1@test.com",
                dateOffset: -2,
                description: "Fault codes pulled — pointing to front-left sensor harness."
              },
              {
                seed: "catalog-brakes-sensor-status",
                type: "status_change",
                createdByEmail: "tech1@test.com",
                dateOffset: -2,
                description: "Started harness inspection.",
                statusFrom: "reported",
                statusTo: "in_progress"
              }
            ]
          }
        ]
      },
      tires: {
        conditionState: "replace_recommended",
        lifecycleState: "near_end_of_life",
        issues: [
          {
            seed: "catalog-tires-sidewall",
            issueKey: "sidewall-damage",
            title: "Nearside rear tyre sidewall impact damage",
            status: "reported",
            priority: "high",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -1,
            dueOffset: 1,
            description: "Visible bulge on nearside rear — bus grounded until resolved.",
            updates: [
              {
                seed: "catalog-tires-sidewall-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -1,
                description: "Photographed and bus removed from service immediately."
              }
            ]
          }
        ]
      },
      battery: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "catalog-battery-cell",
            issueKey: "cell-failure",
            title: "Battery cell failure confirmed",
            status: "in_progress",
            priority: "high",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -4,
            dueOffset: 1,
            description: "Load test failed; one cell below retention threshold.",
            updates: [
              {
                seed: "catalog-battery-cell-comment",
                type: "comment",
                createdByEmail: "tech1@test.com",
                dateOffset: -3,
                description: "Replacement battery ordered; waiting for delivery."
              },
              {
                seed: "catalog-battery-cell-status",
                type: "status_change",
                createdByEmail: "tech1@test.com",
                dateOffset: -3,
                description: "Moved to in progress while awaiting part.",
                statusFrom: "reported",
                statusTo: "in_progress"
              }
            ]
          }
        ]
      },
      suspension: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "catalog-suspension-bushing",
            issueKey: "bushing-wear",
            title: "Front suspension bushing play detected",
            status: "reported",
            priority: "medium",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -2,
            dueOffset: 5,
            description: "Clunking noise over rough road confirmed as bushing wear.",
            updates: [
              {
                seed: "catalog-suspension-bushing-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -2,
                description: "Logged after driver noise report."
              }
            ]
          }
        ]
      },
      cooling: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "catalog-cooling-fan",
            issueKey: "fan-fault",
            title: "Cooling fan not engaging at temperature",
            status: "reported",
            priority: "medium",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -2,
            dueOffset: 4,
            description: "Fan relay not activating at normal operating temperature.",
            updates: [
              {
                seed: "catalog-cooling-fan-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -2,
                description: "Reported alongside elevated coolant temperature readings."
              }
            ]
          }
        ]
      },
      transmission: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "catalog-transmission-shift",
            issueKey: "shift-quality",
            title: "Harsh gear changes under acceleration",
            status: "reported",
            priority: "medium",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -3,
            dueOffset: 6,
            description: "Drivers reporting delayed and harsh upshifts above 30 mph.",
            updates: [
              {
                seed: "catalog-transmission-shift-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -3,
                description: "Multiple driver reports over the past week."
              }
            ]
          }
        ]
      },
      electrical: {
        conditionState: "repair_needed",
        issues: [
          {
            seed: "catalog-electrical-sensor",
            issueKey: "sensor-dropout",
            title: "CAN bus sensor dropout on body controller",
            status: "in_progress",
            priority: "high",
            assignedToEmail: "tech1@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -5,
            dueOffset: 2,
            description: "Intermittent sensor loss causing dashboard warning cascade.",
            updates: [
              {
                seed: "catalog-electrical-sensor-comment",
                type: "comment",
                createdByEmail: "tech1@test.com",
                dateOffset: -4,
                description: "Scanning fault memory — CAN communication errors on body module."
              },
              {
                seed: "catalog-electrical-sensor-status",
                type: "status_change",
                createdByEmail: "tech1@test.com",
                dateOffset: -4,
                description: "Investigation started.",
                statusFrom: "reported",
                statusTo: "in_progress"
              }
            ]
          }
        ]
      }
    }
  },
  {
    seed: "showcase:history",
    registrationNumber: "DMO-108",
    name: "Showcase Completed History",
    depotSeed: "depot:north",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2020,
    mileage: 176500,
    lastServiceOffset: -10,
    nextServiceOffset: 20,
    partOverrides: {
      engine: {
        history: [
          {
            seed: "history-engine-mount-work",
            type: "replacement",
            technicianEmail: "tech2@test.com",
            description: "Engine mount replaced following vibration report.",
            dateOffset: -45
          }
        ],
        issues: [
          {
            seed: "history-engine-mount",
            issueKey: "mount-fatigue",
            title: "Engine mount vibration resolved",
            status: "resolved",
            priority: "medium",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -48,
            dueOffset: -45,
            resolvedOffset: -45,
            description: "Excess idle vibration confirmed as mount fatigue.",
            updates: [
              {
                seed: "history-engine-mount-comment",
                type: "comment",
                createdByEmail: "tech2@test.com",
                dateOffset: -47,
                description: "Mount confirmed failed on inspection; replacement ordered."
              },
              {
                seed: "history-engine-mount-signoff",
                type: "sign_off",
                createdByEmail: "tech2@test.com",
                dateOffset: -45,
                description: "Mount replaced and torqued to spec. Vibration resolved.",
                statusFrom: "in_progress",
                statusTo: "awaiting_approval",
                stepNumber: 4
              },
              {
                seed: "history-engine-mount-approved",
                type: "status_change",
                createdByEmail: "manager@test.com",
                dateOffset: -44,
                description: "Approved and closed.",
                statusFrom: "awaiting_approval",
                statusTo: "resolved"
              }
            ],
            progress: {
              currentStep: 4,
              updatedByEmail: "tech2@test.com",
              updatedOffset: -44,
              completedOffset: -44,
              signedOffByEmail: "tech2@test.com",
              signedOffOffset: -45
            }
          }
        ]
      },
      brakes: {
        history: [
          {
            seed: "history-brakes-pad-work",
            type: "replacement",
            technicianEmail: "tech2@test.com",
            description: "Full brake pad set replaced on both axles.",
            dateOffset: -30
          }
        ],
        issues: [
          {
            seed: "history-brakes-pad",
            issueKey: "pad-wear",
            title: "Brake pads replaced — both axles",
            status: "resolved",
            priority: "high",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -35,
            dueOffset: -30,
            resolvedOffset: -30,
            description: "Pad thickness below depot safety threshold on routine check.",
            updates: [
              {
                seed: "history-brakes-pad-comment",
                type: "comment",
                createdByEmail: "tech2@test.com",
                dateOffset: -33,
                description: "Both axles stripped; thickness at limit. New pads fitted."
              },
              {
                seed: "history-brakes-pad-signoff",
                type: "sign_off",
                createdByEmail: "tech2@test.com",
                dateOffset: -30,
                description: "Pads fitted and bleed carried out. Rolling brake test passed.",
                statusFrom: "in_progress",
                statusTo: "awaiting_approval",
                stepNumber: 4
              },
              {
                seed: "history-brakes-pad-approved",
                type: "status_change",
                createdByEmail: "manager@test.com",
                dateOffset: -29,
                description: "Approved and closed.",
                statusFrom: "awaiting_approval",
                statusTo: "resolved"
              }
            ],
            progress: {
              currentStep: 4,
              updatedByEmail: "tech2@test.com",
              updatedOffset: -29,
              completedOffset: -29,
              signedOffByEmail: "tech2@test.com",
              signedOffOffset: -30
            }
          }
        ]
      },
      battery: {
        history: [
          {
            seed: "history-battery-terminal-work",
            type: "repair",
            technicianEmail: "tech2@test.com",
            description: "Battery terminals cleaned and treated.",
            dateOffset: -20
          }
        ],
        issues: [
          {
            seed: "history-battery-terminal",
            issueKey: "terminal-corrosion",
            title: "Battery terminal corrosion cleaned",
            status: "resolved",
            priority: "low",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -22,
            dueOffset: -20,
            resolvedOffset: -20,
            description: "Visible corrosion on both terminals causing charging instability.",
            updates: [
              {
                seed: "history-battery-terminal-comment",
                type: "comment",
                createdByEmail: "tech2@test.com",
                dateOffset: -21,
                description: "Terminals neutralised and contact surfaces polished."
              },
              {
                seed: "history-battery-terminal-signoff",
                type: "sign_off",
                createdByEmail: "tech2@test.com",
                dateOffset: -20,
                description: "Charging voltage confirmed stable after treatment.",
                statusFrom: "in_progress",
                statusTo: "awaiting_approval",
                stepNumber: 4
              },
              {
                seed: "history-battery-terminal-approved",
                type: "status_change",
                createdByEmail: "manager@test.com",
                dateOffset: -19,
                description: "Approved and closed.",
                statusFrom: "awaiting_approval",
                statusTo: "resolved"
              }
            ],
            progress: {
              currentStep: 4,
              updatedByEmail: "tech2@test.com",
              updatedOffset: -19,
              completedOffset: -19,
              signedOffByEmail: "tech2@test.com",
              signedOffOffset: -20
            }
          }
        ]
      },
      transmission: {
        history: [
          {
            seed: "history-transmission-clutch-work",
            type: "replacement",
            technicianEmail: "tech2@test.com",
            description: "Clutch pack replaced following slip under load diagnosis.",
            dateOffset: -60
          }
        ],
        issues: [
          {
            seed: "history-transmission-clutch",
            issueKey: "clutch-wear",
            title: "Clutch pack slip under load resolved",
            status: "resolved",
            priority: "high",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -65,
            dueOffset: -60,
            resolvedOffset: -60,
            description: "Transmission slipping at high load — internal clutch wear confirmed.",
            updates: [
              {
                seed: "history-transmission-clutch-comment",
                type: "comment",
                createdByEmail: "tech2@test.com",
                dateOffset: -63,
                description: "Pressure test confirms clutch pack failure. Stripping transmission."
              },
              {
                seed: "history-transmission-clutch-signoff",
                type: "sign_off",
                createdByEmail: "tech2@test.com",
                dateOffset: -60,
                description: "Clutch pack replaced. Refilled and shift quality verified.",
                statusFrom: "in_progress",
                statusTo: "awaiting_approval",
                stepNumber: 4
              },
              {
                seed: "history-transmission-clutch-approved",
                type: "status_change",
                createdByEmail: "manager@test.com",
                dateOffset: -59,
                description: "Approved and closed.",
                statusFrom: "awaiting_approval",
                statusTo: "resolved"
              }
            ],
            progress: {
              currentStep: 4,
              updatedByEmail: "tech2@test.com",
              updatedOffset: -59,
              completedOffset: -59,
              signedOffByEmail: "tech2@test.com",
              signedOffOffset: -60
            }
          }
        ]
      },
      electrical: {
        history: [
          {
            seed: "history-electrical-lighting-work",
            type: "replacement",
            technicianEmail: "tech2@test.com",
            description: "Failed exterior lamp units replaced on rear cluster.",
            dateOffset: -15
          }
        ],
        issues: [
          {
            seed: "history-electrical-lighting",
            issueKey: "lighting-failure",
            title: "Rear lighting cluster replaced",
            status: "resolved",
            priority: "low",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -18,
            dueOffset: -15,
            resolvedOffset: -15,
            description: "Two rear lamp units inoperative following bulb check.",
            updates: [
              {
                seed: "history-electrical-lighting-comment",
                type: "comment",
                createdByEmail: "tech2@test.com",
                dateOffset: -17,
                description: "Fuse and connector checked OK; lamp units confirmed failed."
              },
              {
                seed: "history-electrical-lighting-signoff",
                type: "sign_off",
                createdByEmail: "tech2@test.com",
                dateOffset: -15,
                description: "Replacement units fitted and all switch positions verified.",
                statusFrom: "in_progress",
                statusTo: "awaiting_approval",
                stepNumber: 4
              },
              {
                seed: "history-electrical-lighting-approved",
                type: "status_change",
                createdByEmail: "manager@test.com",
                dateOffset: -14,
                description: "Approved and closed.",
                statusFrom: "awaiting_approval",
                statusTo: "resolved"
              }
            ],
            progress: {
              currentStep: 4,
              updatedByEmail: "tech2@test.com",
              updatedOffset: -14,
              completedOffset: -14,
              signedOffByEmail: "tech2@test.com",
              signedOffOffset: -15
            }
          }
        ]
      }
    }
  },
  {
    seed: "showcase:all-conditions",
    registrationNumber: "DMO-109",
    name: "Showcase All Conditions",
    depotSeed: "depot:north",
    model: "Alexander Dennis Enviro 400 MMC",
    year: 2021,
    mileage: 122700,
    lastServiceOffset: -40,
    nextServiceOffset: -7,
    partOverrides: {
      engine: {
        conditionState: "good",
        lifecycleState: "within_expected_life"
      },
      brakes: {
        conditionState: "repair_needed",
        lifecycleState: "near_end_of_life",
        issues: [
          {
            seed: "allcond-brakes-fluid",
            issueKey: "fluid-leak",
            title: "Brake hydraulic leak — rear offside",
            status: "reported",
            priority: "high",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -2,
            dueOffset: 1,
            description: "Brake fluid pooling under rear offside wheel arch.",
            updates: [
              {
                seed: "allcond-brakes-fluid-comment",
                type: "comment",
                createdByEmail: "manager@test.com",
                dateOffset: -2,
                description: "Bus grounded. Fluid trail traced to rear caliper."
              }
            ]
          }
        ]
      },
      tires: {
        conditionState: "replace_recommended",
        lifecycleState: "beyond_expected_life",
        issues: [
          {
            seed: "allcond-tires-tread",
            issueKey: "low-tread",
            title: "Tyre tread at service limit",
            status: "in_progress",
            priority: "medium",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -5,
            dueOffset: 2,
            description: "All four tyres measured at or below minimum tread depth.",
            updates: [
              {
                seed: "allcond-tires-tread-comment",
                type: "comment",
                createdByEmail: "tech2@test.com",
                dateOffset: -4,
                description: "Replacement set sourced; waiting on bay availability."
              },
              {
                seed: "allcond-tires-tread-status",
                type: "status_change",
                createdByEmail: "tech2@test.com",
                dateOffset: -4,
                description: "Moved to in progress.",
                statusFrom: "reported",
                statusTo: "in_progress"
              }
            ]
          }
        ]
      },
      battery: {
        conditionState: "good",
        lifecycleState: "beyond_life_approved",
        lastReplacementOffset: -1200
      },
      suspension: {
        conditionState: "good",
        lifecycleState: "near_end_of_life"
      },
      cooling: {
        conditionState: "repair_needed",
        lifecycleState: "within_expected_life",
        issues: [
          {
            seed: "allcond-cooling-thermostat",
            issueKey: "thermostat-stuck",
            title: "Thermostat slow to open on warm-up",
            status: "awaiting_approval",
            priority: "medium",
            assignedToEmail: "tech2@test.com",
            createdByEmail: "manager@test.com",
            createdOffset: -8,
            dueOffset: -1,
            description: "Engine slow to reach operating temperature — thermostat replaced.",
            updates: [
              {
                seed: "allcond-cooling-thermostat-comment",
                type: "comment",
                createdByEmail: "tech2@test.com",
                dateOffset: -6,
                description: "Live data confirmed thermostat stuck partially closed."
              },
              {
                seed: "allcond-cooling-thermostat-status",
                type: "status_change",
                createdByEmail: "tech2@test.com",
                dateOffset: -5,
                description: "Started replacement.",
                statusFrom: "reported",
                statusTo: "in_progress"
              },
              {
                seed: "allcond-cooling-thermostat-signoff",
                type: "sign_off",
                createdByEmail: "tech2@test.com",
                dateOffset: -1,
                description: "Thermostat and seal replaced. Warm-up cycle normal. Awaiting sign-off.",
                statusFrom: "in_progress",
                statusTo: "awaiting_approval",
                stepNumber: 4
              }
            ],
            progress: {
              currentStep: 4,
              updatedByEmail: "tech2@test.com",
              updatedOffset: -1,
              signedOffByEmail: "tech2@test.com",
              signedOffOffset: -1
            }
          }
        ]
      },
      transmission: {
        conditionState: "good",
        lifecycleState: "beyond_expected_life",
        lastReplacementOffset: -900
      },
      electrical: {
        conditionState: "good",
        lifecycleState: "within_expected_life"
      }
    }
  }
];

const run = async () => {
  const fleet = await fleetService.getAllBuses();
  const jobs = await jobService.getJobsForUser({ id: "seed-admin", role: "admin" });
  const mockFaults = await faultService.getAllFaults({});
  const baseComponentTemplates = new Map(
    (fleet[0]?.components || []).map((component) => [component.id, component])
  );
  const showcasePartOrder = (fleet[0]?.components || []).map((component) => component.id);

  if (baseComponentTemplates.size === 0 || showcasePartOrder.length === 0) {
    throw new Error("Seed script requires the mock fleet dataset to define showcase part templates");
  }

  const userIdByEmail = new Map();
  const roleIdByName = new Map();
  const depotIdBySeed = new Map();
  const busIdByLegacyId = new Map();
  const partIdByLegacyKey = new Map();
  const toolTypeIdByName = new Map();
  const partTypeIdByCode = new Map();
  const issueTypeIdByKey = new Map();
  const issueTypesByPartCode = new Map();
  let showcaseIssueCount = 0;
  let showcaseMaintenanceCount = 0;

  await db.withTransaction(async (client) => {
    await client.query(
      `DELETE FROM issue_assignments
       WHERE issue_id IN (
         SELECT id FROM issues WHERE title = 'DB smoke fault'
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
        `INSERT INTO depots (id, name, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name`,
        [depotId, depot.name]
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

    const partTypeCodes = [...new Set([
      ...lifecyclePolicies.map((policy) => policy.partCode),
      ...getIssueCatalogEntries().map((issueType) => issueType.partCode)
    ])];

    const partTypeLabelByCode = {
      engine: "Engine",
      brakes: "Brakes",
      tires: "Tires",
      battery: "Battery",
      suspension: "Suspension",
      cooling: "Cooling System",
      transmission: "Transmission",
      electrical: "Electrical Systems",
      generic: "Generic"
    };

    for (const partTypeCode of partTypeCodes) {
      const partTypeId = stableUuid(`part-type:${partTypeCode}`);
      partTypeIdByCode.set(partTypeCode, partTypeId);
      await client.query(
        `INSERT INTO part_types (id, code, name, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name`,
        [partTypeId, partTypeCode, partTypeLabelByCode[partTypeCode] || partTypeCode]
      );
    }

    for (const policy of lifecyclePolicies) {
      const policyId = stableUuid(`part-policy:${policy.partCode}`);
      await client.query(
        `INSERT INTO part_lifecycle_policies (
          id,
          part_type_id,
          usage_model,
          expected_life_days,
          expected_life_mileage,
          inspection_interval_days,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (part_type_id) DO UPDATE
        SET usage_model = EXCLUDED.usage_model,
            expected_life_days = EXCLUDED.expected_life_days,
            expected_life_mileage = EXCLUDED.expected_life_mileage,
            inspection_interval_days = EXCLUDED.inspection_interval_days,
            updated_at = NOW()`,
        [
          policyId,
          partTypeIdByCode.get(policy.partCode),
          policy.usageModel,
          policy.expectedLifeDays ?? null,
          policy.expectedLifeMileage ?? null,
          policy.inspectionIntervalDays ?? null
        ]
      );
    }

    for (const issueType of getIssueCatalogEntries()) {
      const issueTypeId = stableUuid(`issue-type:${issueType.partCode}:${issueType.key}`);
      issueTypeIdByKey.set(`${issueType.partCode}:${issueType.key}`, issueTypeId);
      const knownIssueTypes = issueTypesByPartCode.get(issueType.partCode) || [];
      knownIssueTypes.push({
        id: issueTypeId,
        key: issueType.key,
        recommendedAction: issueType.recommendedAction
      });
      issueTypesByPartCode.set(issueType.partCode, knownIssueTypes);
      await client.query(
        `INSERT INTO issue_types (
          id,
          part_type_id,
          code,
          label,
          summary,
          inspection_step,
          default_priority,
          recommended_action,
          guide_title,
          guide_steps,
          required_tool_types,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, NOW())
        ON CONFLICT (code) DO UPDATE
        SET part_type_id = EXCLUDED.part_type_id,
            label = EXCLUDED.label,
            summary = EXCLUDED.summary,
            inspection_step = EXCLUDED.inspection_step,
            default_priority = EXCLUDED.default_priority,
            recommended_action = EXCLUDED.recommended_action,
            guide_title = EXCLUDED.guide_title,
            guide_steps = EXCLUDED.guide_steps,
            required_tool_types = EXCLUDED.required_tool_types`,
        [
          issueTypeId,
          partTypeIdByCode.get(issueType.partCode),
          issueType.key,
          issueType.label,
          issueType.summary,
          issueType.inspectionStep || null,
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

    for (const toolState of showcaseToolStates) {
      await client.query(
        `UPDATE tools
         SET status = $1,
             last_used_by = $2,
             last_used_at = $3
         WHERE depot_id = $4
           AND tool_type_id = $5`,
        [
          toolState.status,
          userIdByEmail.get(toolState.lastUsedByEmail) || null,
          getRelativeTimestamp(toolState.lastUsedOffset),
          depotIdBySeed.get(toolState.depotSeed),
          toolTypeIdByName.get(toolState.toolTypeName)
        ]
      );
    }

    const getUserNameByEmail = (email) => users.find((user) => user.email === email)?.name || "System";

    const getIssueTypeIdForScenario = (partCode, preferredAction) => {
      const knownIssueTypes = issueTypesByPartCode.get(partCode) || [];
      return knownIssueTypes.find((issueType) => issueType.recommendedAction === preferredAction)?.id
        || issueTypeIdByKey.get(`${partCode}:${getDefaultIssueTypeKeyForPart(partCode)}`)
        || knownIssueTypes[0]?.id
        || null;
    };

    const getIssueTypeIdByKey = (partCode, issueKey) =>
      issueTypeIdByKey.get(`${partCode}:${issueKey}`) || getIssueTypeIdForScenario(partCode, "repair");

    const upsertShowcaseIssue = async ({ issue, partId, partCode, busName }) => {
      const issueId = stableUuid(`showcase:issue:${issue.seed}`);
      const issueTypeId = issue.issueKey
        ? getIssueTypeIdByKey(partCode, issue.issueKey)
        : getIssueTypeIdForScenario(partCode, issue.preferredAction || "repair");
      const createdById = userIdByEmail.get(issue.createdByEmail) || null;
      const assignedUserId = userIdByEmail.get(issue.assignedToEmail) || null;
      const createdAt = getRelativeTimestamp(issue.createdOffset);
      const dueAt = issue.dueOffset === undefined ? null : getRelativeTimestamp(issue.dueOffset);
      const resolvedAt = issue.resolvedOffset === undefined ? null : getRelativeTimestamp(issue.resolvedOffset);
      const updatedAt = resolvedAt || getRelativeTimestamp(issue.updatedOffset ?? issue.createdOffset);

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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NULL, $12, 'seed_showcase')
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
          issue.title,
          issue.status,
          issue.priority,
          issue.description || `Showcase issue for ${busName} / ${partCode}.`,
          createdAt,
          updatedAt,
          dueAt,
          resolvedAt
        ]
      );

      if (assignedUserId) {
        await client.query(
          `INSERT INTO issue_assignments (id, issue_id, user_id, assigned_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE
           SET issue_id = EXCLUDED.issue_id,
               user_id = EXCLUDED.user_id,
               assigned_at = EXCLUDED.assigned_at`,
          [stableUuid(`showcase:assignment:${issue.seed}`), issueId, assignedUserId, createdAt]
        );
      }

      const updates = issue.updates || [];
      for (const update of updates) {
        const updateId = stableUuid(`showcase:issue-update:${update.seed}`);
        const updateCreatedById = userIdByEmail.get(update.createdByEmail) || null;
        const updateCreatedAt = getRelativeTimestamp(update.dateOffset);

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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET issue_id = EXCLUDED.issue_id,
              created_at = EXCLUDED.created_at,
              created_by = EXCLUDED.created_by,
              update_type = EXCLUDED.update_type,
              description = EXCLUDED.description,
              status_from = EXCLUDED.status_from,
              status_to = EXCLUDED.status_to,
              step_number = EXCLUDED.step_number,
              metadata = EXCLUDED.metadata`,
          [
            updateId,
            issueId,
            updateCreatedAt,
            updateCreatedById,
            update.type,
            update.description,
            update.statusFrom || null,
            update.statusTo || null,
            update.stepNumber || null,
            JSON.stringify({ seededFrom: "showcase", issueSeed: issue.seed, updateSeed: update.seed })
          ]
        );

      }

      showcaseIssueCount += 1;
    };

    const upsertShowcaseScenario = async (scenario) => {
      const busId = stableUuid(`showcase:bus:${scenario.seed}`);

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
          depotIdBySeed.get(scenario.depotSeed),
          scenario.registrationNumber,
          scenario.name,
          scenario.model,
          "showcase",
          scenario.mileage,
          getRelativeTimestamp(scenario.lastServiceOffset),
          scenario.nextServiceOffset === null ? null : getRelativeTimestamp(scenario.nextServiceOffset),
          scenario.year
        ]
      );

      for (const [partIndex, partCode] of showcasePartOrder.entries()) {
        const baseComponent = baseComponentTemplates.get(partCode);
        const override = scenario.partOverrides[partCode] || {};
        const partId = stableUuid(`showcase:part:${scenario.seed}:${partCode}`);
        const guideId = stableUuid(`showcase:guide:${scenario.seed}:${partCode}`);
        const instructions = override.arInstructions || baseComponent.arInstructions || [];
        const lastServiceAt = getRelativeTimestamp(override.lastServiceOffset ?? scenario.lastServiceOffset ?? -21);
        const lastInspectedAt = getRelativeTimestamp(override.lastInspectedOffset ?? override.lastServiceOffset ?? scenario.lastServiceOffset ?? -21);
        const lastRepairAt = getRelativeTimestamp(override.lastRepairOffset ?? -56);
        const lastReplacementAt = getRelativeTimestamp(override.lastReplacementOffset ?? -420);

        await client.query(
          `INSERT INTO bus_parts (
            id,
            bus_id,
            part_type_id,
            name,
            marker_code,
            icon_key,
            condition_state,
            lifecycle_state,
            last_repair_at,
            last_inspected_at,
            last_service_at,
            last_replacement_at,
            ar_instructions
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET bus_id = EXCLUDED.bus_id,
              part_type_id = EXCLUDED.part_type_id,
              name = EXCLUDED.name,
              marker_code = EXCLUDED.marker_code,
              icon_key = EXCLUDED.icon_key,
              condition_state = EXCLUDED.condition_state,
              lifecycle_state = EXCLUDED.lifecycle_state,
              last_repair_at = EXCLUDED.last_repair_at,
              last_inspected_at = EXCLUDED.last_inspected_at,
              last_service_at = EXCLUDED.last_service_at,
              last_replacement_at = EXCLUDED.last_replacement_at,
              ar_instructions = EXCLUDED.ar_instructions`,
          [
            partId,
            busId,
            partTypeIdByCode.get(partCode),
            baseComponent.name,
            getBusMarkerCode(partIndex),
            baseComponent.icon,
            override.conditionState || "good",
            override.lifecycleState || "within_expected_life",
            lastRepairAt,
            lastInspectedAt,
            lastServiceAt,
            lastReplacementAt,
            JSON.stringify(instructions)
          ]
        );

        await client.query(
          `INSERT INTO repair_guides (id, bus_part_id, title)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE
           SET bus_part_id = EXCLUDED.bus_part_id,
               title = EXCLUDED.title`,
          [guideId, partId, `${baseComponent.name} Repair Guide`]
        );

        for (const [stepIndex, instruction] of instructions.entries()) {
          await client.query(
            `INSERT INTO repair_steps (id, guide_id, step_number, instruction)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE
             SET guide_id = EXCLUDED.guide_id,
                 step_number = EXCLUDED.step_number,
                 instruction = EXCLUDED.instruction`,
            [
              stableUuid(`showcase:guide-step:${scenario.seed}:${partCode}:${stepIndex + 1}`),
              guideId,
              stepIndex + 1,
              instruction
            ]
          );
        }

        for (const toolTypeName of partToolMap[partCode] || ["Diagnostic Scanner"]) {
          await client.query(
            `INSERT INTO repair_guide_tool_types (id, guide_id, tool_type_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE
             SET guide_id = EXCLUDED.guide_id,
                 tool_type_id = EXCLUDED.tool_type_id`,
            [
              stableUuid(`showcase:guide-tool:${scenario.seed}:${partCode}:${toolTypeName}`),
              guideId,
              toolTypeIdByName.get(toolTypeName)
            ]
          );
        }

        for (const historyEntry of override.history || []) {
          const technicianUserId = userIdByEmail.get(historyEntry.technicianEmail) || null;

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
              stableUuid(`showcase:maintenance:${scenario.seed}:${partCode}:${historyEntry.seed}`),
              partId,
              technicianUserId,
              historyEntry.technicianName || getUserNameByEmail(historyEntry.technicianEmail),
              historyEntry.type,
              historyEntry.description,
              historyEntry.notes || null,
              getRelativeTimestamp(historyEntry.dateOffset)
            ]
          );

          showcaseMaintenanceCount += 1;
        }

        for (const issue of override.issues || []) {
          await upsertShowcaseIssue({
            issue,
            partId,
            partCode,
            busName: scenario.name
          });
        }
      }
    };

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
            part_type_id,
            name,
            marker_code,
            icon_key,
            condition_state,
            lifecycle_state,
            last_repair_at,
            last_inspected_at,
            last_service_at,
            last_replacement_at,
            ar_instructions
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET bus_id = EXCLUDED.bus_id,
              part_type_id = EXCLUDED.part_type_id,
              name = EXCLUDED.name,
              marker_code = EXCLUDED.marker_code,
              icon_key = EXCLUDED.icon_key,
              condition_state = EXCLUDED.condition_state,
              lifecycle_state = EXCLUDED.lifecycle_state,
              last_repair_at = EXCLUDED.last_repair_at,
              last_inspected_at = EXCLUDED.last_inspected_at,
              last_service_at = EXCLUDED.last_service_at,
              last_replacement_at = EXCLUDED.last_replacement_at,
              ar_instructions = EXCLUDED.ar_instructions`,
          [
            partId,
            busId,
            partTypeIdByCode.get(resolvePartCode(component.name, component.id)),
            component.name,
            getBusMarkerCode(componentIndex),
            component.icon,
            componentStatusMap[component.status] || "good",
            componentLifecycleMap[component.status] || "within_expected_life",
            toTimestamp(component.lastRepair),
            toTimestamp(component.lastService),
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

    for (const scenario of showcaseBusScenarios) {
      await upsertShowcaseScenario(scenario);
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

      }
    }
  });

  await db.getPool().end();

  console.log(
    `Seeded ${fleet.length} baseline buses, ${showcaseBusScenarios.length} showcase buses, ${jobs.length} jobs, ${mockFaults.length} mock faults, ${showcaseIssueCount} showcase issues, ${showcaseMaintenanceCount} showcase maintenance entries, and ${users.length} users into PostgreSQL.`
  );
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