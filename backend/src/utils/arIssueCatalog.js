const BUS_MARKER_START = 20;
const TOOL_MARKER_START = 500;

const defaultToolNames = [
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

const issueCatalog = {
  engine: [
    {
      key: "oil-leak",
      label: "Oil Leak",
      summary: "Seepage around gaskets or engine seals.",
      recommendedAction: "repair",
      priority: "high",
      guideTitle: "Seal And Gasket Repair",
      guideSteps: [
        "Clean the engine casing and identify the leak origin.",
        "Inspect sump and rocker cover gasket seating.",
        "Replace the failed seal or gasket and torque to spec.",
        "Run the engine for five minutes and confirm the leak is gone."
      ],
      requiredToolTypes: ["Diagnostic Scanner", "Torque Wrench"]
    },
    {
      key: "overheat",
      label: "Overheating",
      summary: "Temperature spike or repeated thermal cutback.",
      recommendedAction: "repair",
      priority: "high",
      guideTitle: "Engine Cooling Recovery",
      guideSteps: [
        "Read active fault codes and coolant temperature data.",
        "Check coolant flow and inspect the thermostat housing.",
        "Inspect fan drive operation and radiator airflow restriction.",
        "Road-test after repair and verify stable operating temperature."
      ],
      requiredToolTypes: ["Diagnostic Scanner", "Coolant Pressure Tester"]
    },
    {
      key: "mount-fatigue",
      label: "Mount Fatigue",
      summary: "Excess vibration traced to worn engine mounts.",
      recommendedAction: "replacement",
      priority: "medium",
      guideTitle: "Engine Mount Replacement",
      guideSteps: [
        "Support the engine before unloading the mount.",
        "Inspect adjacent brackets and mounting hardware for stretch.",
        "Replace the failed mount and torque all fasteners to spec.",
        "Recheck idle vibration and drivetrain alignment."
      ],
      requiredToolTypes: ["Hydraulic Jack", "Torque Wrench"]
    }
  ],
  brakes: [
    {
      key: "pad-wear",
      label: "Pad Wear",
      summary: "Brake friction material below service threshold.",
      recommendedAction: "replacement",
      priority: "high",
      guideTitle: "Brake Pad Replacement",
      guideSteps: [
        "Measure remaining pad thickness at both calipers.",
        "Remove the worn pad set and inspect slider movement.",
        "Fit new pads and lubricate contact points.",
        "Bleed if required and perform a rolling brake test."
      ],
      requiredToolTypes: ["Brake Caliper Tool", "Torque Wrench"]
    },
    {
      key: "fluid-leak",
      label: "Hydraulic Leak",
      summary: "Fluid loss around brake line or caliper assembly.",
      recommendedAction: "repair",
      priority: "high",
      guideTitle: "Brake Line Leak Repair",
      guideSteps: [
        "Trace the leak path from reservoir to wheel end.",
        "Replace the leaking hose or sealing washer.",
        "Refill the reservoir and bleed the affected circuit.",
        "Verify pedal pressure and confirm no further seepage."
      ],
      requiredToolTypes: ["Brake Caliper Tool", "Torque Wrench"]
    },
    {
      key: "sensor-fault",
      label: "ABS Sensor Fault",
      summary: "Wheel speed input missing or unstable.",
      recommendedAction: "repair",
      priority: "medium",
      guideTitle: "ABS Sensor Diagnostics",
      guideSteps: [
        "Scan ABS fault memory and isolate the affected wheel channel.",
        "Inspect harness routing and connector corrosion.",
        "Reset or replace the sensor and clear stored faults.",
        "Verify wheel speed readings during a short test drive."
      ],
      requiredToolTypes: ["Diagnostic Scanner", "Multimeter"]
    }
  ],
  tires: [
    {
      key: "low-tread",
      label: "Low Tread",
      summary: "Tread depth at or below service limit.",
      recommendedAction: "replacement",
      priority: "medium",
      guideTitle: "Tire Replacement",
      guideSteps: [
        "Measure tread depth across the full contact patch.",
        "Lift the axle and remove the wheel safely.",
        "Fit the replacement tire and torque wheel fasteners.",
        "Set pressure to target value and recheck after a short roll."
      ],
      requiredToolTypes: ["Hydraulic Jack", "Torque Wrench"]
    },
    {
      key: "sidewall-damage",
      label: "Sidewall Damage",
      summary: "Cuts, bulges, or impact damage on the tire wall.",
      recommendedAction: "replacement",
      priority: "high",
      guideTitle: "Damaged Tire Isolation",
      guideSteps: [
        "Photograph and isolate the damaged tire from service.",
        "Check the wheel rim and valve stem for impact damage.",
        "Replace the tire and rebalance if required.",
        "Confirm pressure stability before releasing the bus."
      ],
      requiredToolTypes: ["Hydraulic Jack", "Torque Wrench"]
    },
    {
      key: "pressure-loss",
      label: "Pressure Loss",
      summary: "Repeated loss of inflation between checks.",
      recommendedAction: "repair",
      priority: "medium",
      guideTitle: "Pressure Loss Inspection",
      guideSteps: [
        "Inflate the tire to specification and perform a leak test.",
        "Inspect bead seating, valve core, and puncture site.",
        "Repair or replace based on casing condition.",
        "Confirm pressure remains stable after repair."
      ],
      requiredToolTypes: ["Hydraulic Jack", "Torque Wrench"]
    }
  ],
  battery: [
    {
      key: "low-voltage",
      label: "Low Voltage",
      summary: "Battery output below operational range.",
      recommendedAction: "repair",
      priority: "medium",
      guideTitle: "Battery Recovery Check",
      guideSteps: [
        "Measure resting and cranking voltage.",
        "Inspect terminals for corrosion and tighten as required.",
        "Load-test the battery and compare against service threshold.",
        "Replace only if it fails to recover under load."
      ],
      requiredToolTypes: ["Battery Tester", "Multimeter"]
    },
    {
      key: "terminal-corrosion",
      label: "Terminal Corrosion",
      summary: "Visible corrosion causing unstable current delivery.",
      recommendedAction: "repair",
      priority: "low",
      guideTitle: "Terminal Cleaning Procedure",
      guideSteps: [
        "Disconnect the battery and inspect terminal clamps.",
        "Neutralize corrosion and clean the contact surfaces.",
        "Reinstall and protect the terminals with approved compound.",
        "Verify charging voltage after reconnecting."
      ],
      requiredToolTypes: ["Battery Tester", "Multimeter"]
    },
    {
      key: "cell-failure",
      label: "Cell Failure",
      summary: "One or more cells no longer hold charge.",
      recommendedAction: "replacement",
      priority: "high",
      guideTitle: "Battery Replacement",
      guideSteps: [
        "Confirm the failed cell through a load and voltage test.",
        "Disconnect, isolate, and remove the battery safely.",
        "Install the replacement unit and secure all retainers.",
        "Validate charging performance with the engine running."
      ],
      requiredToolTypes: ["Battery Tester", "Multimeter"]
    }
  ],
  suspension: [
    {
      key: "shock-leak",
      label: "Shock Leak",
      summary: "Hydraulic loss from damper body or seal.",
      recommendedAction: "replacement",
      priority: "medium",
      guideTitle: "Shock Absorber Replacement",
      guideSteps: [
        "Inspect the damper body and confirm active fluid loss.",
        "Support the suspension and remove the worn shock.",
        "Install the new unit and torque upper and lower mounts.",
        "Verify ride height and rebound control."
      ],
      requiredToolTypes: ["Hydraulic Jack", "Torque Wrench"]
    },
    {
      key: "airbag-leak",
      label: "Air Bag Leak",
      summary: "Loss of air pressure affecting ride height.",
      recommendedAction: "repair",
      priority: "high",
      guideTitle: "Air Suspension Leak Repair",
      guideSteps: [
        "Soap-test the airbag and supply fittings.",
        "Replace the leaking fitting or air line.",
        "Re-pressurize the system and verify ride height.",
        "Confirm no audible leaks remain under load."
      ],
      requiredToolTypes: ["Hydraulic Jack", "Torque Wrench"]
    },
    {
      key: "bushing-wear",
      label: "Bushing Wear",
      summary: "Excess play in bushings or stabilizer joints.",
      recommendedAction: "replacement",
      priority: "medium",
      guideTitle: "Suspension Bushing Replacement",
      guideSteps: [
        "Measure joint play and inspect for split rubber.",
        "Unload the joint and press out the failed bushing.",
        "Fit the replacement bushing and reassemble.",
        "Verify alignment and road-test for noise elimination."
      ],
      requiredToolTypes: ["Hydraulic Jack", "Torque Wrench"]
    }
  ],
  cooling: [
    {
      key: "coolant-leak",
      label: "Coolant Leak",
      summary: "Visible coolant loss from hose, radiator, or pump.",
      recommendedAction: "repair",
      priority: "high",
      guideTitle: "Cooling Leak Repair",
      guideSteps: [
        "Pressure-test the cooling system and localize the leak.",
        "Inspect hose clamps, radiator seams, and pump housing.",
        "Replace the failed component and refill coolant.",
        "Bleed the system and verify stable temperature."
      ],
      requiredToolTypes: ["Coolant Pressure Tester", "Diagnostic Scanner"]
    },
    {
      key: "fan-fault",
      label: "Cooling Fan Fault",
      summary: "Fan not engaging at the required temperature.",
      recommendedAction: "repair",
      priority: "medium",
      guideTitle: "Cooling Fan Diagnostics",
      guideSteps: [
        "Command fan activation through the diagnostic system.",
        "Inspect fan relay, fuse, and power delivery.",
        "Repair the failed control circuit or replace the motor.",
        "Retest under thermal load."
      ],
      requiredToolTypes: ["Diagnostic Scanner", "Multimeter"]
    },
    {
      key: "thermostat-stuck",
      label: "Thermostat Stuck",
      summary: "Thermostat not opening or closing correctly.",
      recommendedAction: "replacement",
      priority: "medium",
      guideTitle: "Thermostat Replacement",
      guideSteps: [
        "Confirm incorrect temperature behavior through live data.",
        "Drain enough coolant to access the thermostat housing.",
        "Replace the thermostat and housing seal.",
        "Refill, bleed, and confirm stable warm-up behavior."
      ],
      requiredToolTypes: ["Coolant Pressure Tester", "Torque Wrench"]
    }
  ],
  transmission: [
    {
      key: "fluid-leak",
      label: "Fluid Leak",
      summary: "Transmission fluid loss from gasket or cooler line.",
      recommendedAction: "repair",
      priority: "high",
      guideTitle: "Transmission Leak Repair",
      guideSteps: [
        "Inspect pan gasket, lines, and cooler joints for leaks.",
        "Replace the failed seal or damaged line.",
        "Refill transmission fluid to target level.",
        "Test shift performance and recheck for leaks."
      ],
      requiredToolTypes: ["Diagnostic Scanner", "Torque Wrench"]
    },
    {
      key: "shift-quality",
      label: "Poor Shift Quality",
      summary: "Delayed, harsh, or inconsistent gear changes.",
      recommendedAction: "repair",
      priority: "medium",
      guideTitle: "Shift Quality Diagnostics",
      guideSteps: [
        "Read transmission control faults and adaptation values.",
        "Inspect fluid condition and line pressure response.",
        "Repair valve body or sensor issue as indicated.",
        "Reset adaptations and road-test through full shift range."
      ],
      requiredToolTypes: ["Diagnostic Scanner", "Multimeter"]
    },
    {
      key: "clutch-wear",
      label: "Clutch Pack Wear",
      summary: "Internal wear causing slip under load.",
      recommendedAction: "replacement",
      priority: "high",
      guideTitle: "Transmission Clutch Pack Replacement",
      guideSteps: [
        "Confirm slip through live data and pressure testing.",
        "Remove and strip the transmission assembly.",
        "Replace worn clutch pack components and seals.",
        "Refit, refill, and validate engagement quality."
      ],
      requiredToolTypes: ["Diagnostic Scanner", "Torque Wrench"]
    }
  ],
  electrical: [
    {
      key: "wiring-damage",
      label: "Wiring Damage",
      summary: "Open circuit or abrasion within harness routing.",
      recommendedAction: "repair",
      priority: "medium",
      guideTitle: "Harness Repair",
      guideSteps: [
        "Identify the affected circuit and isolate the damaged span.",
        "Repair the conductor and restore insulation protection.",
        "Secure the harness away from vibration or pinch points.",
        "Retest the circuit under operating load."
      ],
      requiredToolTypes: ["Multimeter", "Diagnostic Scanner"]
    },
    {
      key: "lighting-failure",
      label: "Lighting Failure",
      summary: "Exterior or cabin lighting no longer operational.",
      recommendedAction: "replacement",
      priority: "low",
      guideTitle: "Lighting Circuit Replacement",
      guideSteps: [
        "Check lamp output and confirm the failed side or circuit.",
        "Inspect fuse protection and connector seating.",
        "Replace the failed lamp or control unit as required.",
        "Verify operation in all switch positions."
      ],
      requiredToolTypes: ["Multimeter", "Diagnostic Scanner"]
    },
    {
      key: "sensor-dropout",
      label: "Sensor Dropout",
      summary: "Intermittent sensor reading or CAN communication loss.",
      recommendedAction: "repair",
      priority: "high",
      guideTitle: "Sensor Signal Recovery",
      guideSteps: [
        "Scan the affected control unit for communication faults.",
        "Inspect sensor power, ground, and data paths.",
        "Replace or reseat the failing sensor and connector.",
        "Clear faults and verify stable live readings."
      ],
      requiredToolTypes: ["Diagnostic Scanner", "Multimeter"]
    }
  ],
  generic: [
    {
      key: "inspection-required",
      label: "Inspection Required",
      summary: "General inspection requested for this component.",
      recommendedAction: "repair",
      priority: "medium",
      guideTitle: "Inspection Guide",
      guideSteps: [
        "Inspect the component for visible damage or abnormal wear.",
        "Check fasteners, seals, and nearby connections.",
        "Test functional operation against service expectations.",
        "Record findings and escalate to replacement only if needed."
      ],
      requiredToolTypes: ["Diagnostic Scanner"]
    }
  ]
};

const partNameMap = new Map([
  ["engine", "engine"],
  ["brakes", "brakes"],
  ["tires", "tires"],
  ["battery", "battery"],
  ["suspension", "suspension"],
  ["cooling system", "cooling"],
  ["cooling", "cooling"],
  ["transmission", "transmission"],
  ["electrical systems", "electrical"],
  ["electrical", "electrical"]
]);

const knownIssueKeys = new Set(Object.values(issueCatalog).flat().map((issueType) => issueType.key));

const resolvePartCode = (name, fallbackCode) => {
  const normalizedFallback = String(fallbackCode || "").trim().toLowerCase();
  if (normalizedFallback && issueCatalog[normalizedFallback]) {
    return normalizedFallback;
  }

  const normalizedName = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return partNameMap.get(normalizedName) || normalizedFallback || "generic";
};

const getBusMarkerCode = (partIndex) => BUS_MARKER_START + partIndex;

const getToolMarkerCode = (toolIndex) => TOOL_MARKER_START + toolIndex;

const buildGuide = (issueType, baseInstructions = []) => ({
  title: issueType.guideTitle,
  recommendedAction: issueType.recommendedAction,
  steps: [...issueType.guideSteps, ...baseInstructions.slice(0, 2)],
  requiredToolTypes: issueType.requiredToolTypes
});

const getIssueTypeOptionsForPart = (partCode, baseInstructions = []) => {
  const issueTypes = issueCatalog[partCode] || issueCatalog.generic;
  return issueTypes.map((issueType) => ({
    key: issueType.key,
    label: issueType.label,
    summary: issueType.summary,
    priority: issueType.priority,
    recommendedAction: issueType.recommendedAction,
    guide: buildGuide(issueType, baseInstructions)
  }));
};

const getIssueCatalogEntries = () => Object.entries(issueCatalog).flatMap(([partCode, issueTypes]) =>
  issueTypes.map((issueType) => ({
    partCode,
    key: issueType.key,
    label: issueType.label,
    summary: issueType.summary,
    priority: issueType.priority,
    recommendedAction: issueType.recommendedAction,
    guideTitle: issueType.guideTitle,
    guideSteps: [...issueType.guideSteps],
    requiredToolTypes: [...issueType.requiredToolTypes]
  }))
);

const encodeIssueSource = (issueTypeKey, prefix = "ar_issue") => `${prefix}:${issueTypeKey}`;

const parseIssueTypeKey = (source) => {
  const sourceValue = String(source || "").trim();
  if (!sourceValue) {
    return null;
  }

  const segments = sourceValue.split(":");
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (knownIssueKeys.has(segments[index])) {
      return segments[index];
    }
  }

  return null;
};

const resolveIssueTypeForPart = (partCode, source, baseInstructions = []) => {
  const issueTypeKey = parseIssueTypeKey(source);
  const availableIssueTypes = getIssueTypeOptionsForPart(partCode, baseInstructions);
  if (!issueTypeKey) {
    return availableIssueTypes[0] || null;
  }

  return availableIssueTypes.find((issueType) => issueType.key === issueTypeKey) || availableIssueTypes[0] || null;
};

const getDefaultIssueTypeKeyForPart = (partCode) => {
  const issueTypes = issueCatalog[partCode] || issueCatalog.generic;
  return issueTypes[0].key;
};

module.exports = {
  BUS_MARKER_START,
  TOOL_MARKER_START,
  defaultToolNames,
  resolvePartCode,
  getBusMarkerCode,
  getToolMarkerCode,
  getIssueCatalogEntries,
  getIssueTypeOptionsForPart,
  encodeIssueSource,
  parseIssueTypeKey,
  resolveIssueTypeForPart,
  getDefaultIssueTypeKeyForPart
};