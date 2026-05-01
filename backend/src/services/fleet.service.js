// This file contains the main fleet logic using temporary mock data.

const { randomUUID } = require("crypto");

// Helper function to create a bus component
const createComponent = (
  id,
  name,
  icon,
  status,
  lastRepair,
  lastService,
  lastReplacement,
  healthPercent,
  history,
  arInstructions
) => ({
  id,
  name,
  icon,
  status,
  lastRepair,
  lastService,
  lastReplacement,
  healthPercent,
  history,
  arInstructions
});

// Default component data used by each bus
const defaultComponents = [
  createComponent("engine", "Engine", "Cog", "Good", "2025-11-15", "2026-01-10", "2024-06-01", 85, [
    { id: "e1", date: "2026-01-10", type: "service", description: "Oil change and filter replacement", technician: "Mike R." },
    { id: "e2", date: "2025-11-15", type: "repair", description: "Fixed minor oil leak at gasket", technician: "Sarah K." }
  ], ["Locate the engine compartment at the front of the bus", "Open the hood latch on the driver side", "Inspect belt tension and oil levels", "Check coolant reservoir level", "Inspect air filter condition"]),

  createComponent("brakes", "Brakes", "Disc", "Due Soon", "2025-12-20", "2026-01-05", "2025-03-15", 45, [
    { id: "b1", date: "2026-01-05", type: "service", description: "Brake pad inspection - 40% remaining", technician: "Mike R." },
    { id: "b2", date: "2025-12-20", type: "repair", description: "Replaced rear brake caliper", technician: "James T." }
  ], ["Locate brake assembly behind each wheel", "Remove wheel to access brake pads", "Measure pad thickness with calipers", "Inspect rotor surface for scoring", "Check brake fluid level in reservoir"]),

  createComponent("tires", "Tires", "Circle", "Good", "2025-10-01", "2026-02-15", "2025-08-20", 72, [
    { id: "t1", date: "2026-02-15", type: "service", description: "Tire rotation and pressure check", technician: "Sarah K." }
  ], ["Check tire pressure using gauge - target 100 PSI", "Inspect tread depth with penny test", "Look for sidewall damage or bulging", "Check valve stems for leaks", "Verify lug nut torque"]),

  createComponent("battery", "Battery", "Battery", "Good", "2025-09-10", "2026-02-01", "2025-09-10", 90, [
    { id: "ba1", date: "2026-02-01", type: "service", description: "Battery load test - passed", technician: "James T." }
  ], ["Locate battery compartment on driver side", "Check terminal connections for corrosion", "Test voltage with multimeter - target 12.6V", "Inspect battery case for damage", "Clean terminals with baking soda solution"]),

  createComponent("suspension", "Suspension", "ArrowUpDown", "Good", "2025-08-15", "2026-01-20", "2024-12-01", 78, [
    { id: "s1", date: "2026-01-20", type: "service", description: "Suspension inspection - all good", technician: "Mike R." }
  ], ["Inspect shock absorbers for leaks", "Check air bag suspension pressure", "Test ride height at each corner", "Inspect bushings for wear", "Check stabilizer bar links"]),

  createComponent("cooling", "Cooling System", "Thermometer", "Due Soon", "2025-11-01", "2026-01-15", "2024-09-01", 52, [
    { id: "c1", date: "2026-01-15", type: "service", description: "Coolant flush recommended at next service", technician: "Sarah K." }
  ], ["Check coolant level in expansion tank", "Inspect radiator for leaks or damage", "Test thermostat operation", "Check all hose connections", "Inspect water pump for weeping"]),

  createComponent("transmission", "Transmission", "Settings", "Good", "2025-07-20", "2026-02-10", "2024-03-15", 80, [
    { id: "tr1", date: "2026-02-10", type: "service", description: "Transmission fluid level check", technician: "James T." }
  ], ["Check transmission fluid level and color", "Inspect for leaks at pan gasket", "Test shift quality through all gears", "Check linkage adjustment", "Inspect CV joints and boots"]),

  createComponent("electrical", "Electrical Systems", "Zap", "Urgent", "2026-02-28", "2026-02-28", "2025-06-01", 25, [
    { id: "el1", date: "2026-02-28", type: "repair", description: "Intermittent headlight failure - investigating", technician: "Mike R." }
  ], ["Check all exterior lighting", "Test turn signals and hazard lights", "Inspect wiring harness for damage", "Check fuse box for blown fuses", "Test alternator output"])
];

// Helper function to customise component data for each bus
const adjustComponents = (components, overrides) => {
  return components.map((component) => {
    const override = overrides[component.id];

    return override
      ? { ...component, ...override, history: [...component.history], arInstructions: [...component.arInstructions] }
      : { ...component, history: [...component.history], arInstructions: [...component.arInstructions] };
  });
};

// Temporary mock fleet data
const fleet = [
  {
    id: "bus-001",
    name: "BCP Bus 1",
    plateNumber: "BUS-4521",
    status: "Operational",
    mileage: 124350,
    lastServiceDate: "2026-02-15",
    nextServiceDate: "2026-04-15",
    year: 2021,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {})
  },
  {
    id: "bus-002",
    name: "BCP Bus 2",
    plateNumber: "BUS-4522",
    status: "Needs Service",
    mileage: 98720,
    lastServiceDate: "2026-01-10",
    nextServiceDate: "2026-03-10",
    year: 2022,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      brakes: { status: "Urgent", healthPercent: 20 },
      cooling: { status: "Urgent", healthPercent: 30 }
    })
  },
  {
    id: "bus-003",
    name: "BCP Bus 3",
    plateNumber: "BUS-4523",
    status: "Operational",
    mileage: 67890,
    lastServiceDate: "2026-02-20",
    nextServiceDate: "2026-04-20",
    year: 2023,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      electrical: { status: "Good", healthPercent: 88 }
    })
  },
  {
    id: "bus-004",
    name: "BCP Bus 4",
    plateNumber: "BUS-4524",
    status: "Under Repair",
    mileage: 145200,
    lastServiceDate: "2026-02-01",
    nextServiceDate: "2026-03-15",
    year: 2020,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      engine: { status: "Urgent", healthPercent: 15 },
      transmission: { status: "Due Soon", healthPercent: 40 }
    })
  },
  {
    id: "bus-005",
    name: "BCP Bus 5",
    plateNumber: "BUS-4525",
    status: "Operational",
    mileage: 31450,
    lastServiceDate: "2026-03-01",
    nextServiceDate: "2026-05-01",
    year: 2024,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      electrical: { status: "Good", healthPercent: 95 },
      cooling: { status: "Good", healthPercent: 92 }
    })
  },
  {
    id: "bus-006",
    name: "BCP Bus 6",
    plateNumber: "BUS-4526",
    status: "Operational",
    mileage: 52300,
    lastServiceDate: "2026-02-25",
    nextServiceDate: "2026-04-25",
    year: 2023,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      brakes: { status: "Due Soon", healthPercent: 50 }
    })
  },
  {
    id: "bus-007",
    name: "BCP Bus 7",
    plateNumber: "BUS-4527",
    status: "Operational",
    mileage: 76450,
    lastServiceDate: "2026-02-18",
    nextServiceDate: "2026-04-18",
    year: 2022,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      cooling: { status: "Good", healthPercent: 86 },
      electrical: { status: "Good", healthPercent: 82 }
    })
  },
  {
    id: "bus-008",
    name: "BCP Bus 8",
    plateNumber: "BUS-4528",
    status: "Needs Service",
    mileage: 112300,
    lastServiceDate: "2026-01-22",
    nextServiceDate: "2026-03-22",
    year: 2021,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      brakes: { status: "Due Soon", healthPercent: 42 },
      tires: { status: "Due Soon", healthPercent: 48 }
    })
  },
  {
    id: "bus-009",
    name: "BCP Bus 9",
    plateNumber: "BUS-4529",
    status: "Operational",
    mileage: 45890,
    lastServiceDate: "2026-03-03",
    nextServiceDate: "2026-05-03",
    year: 2024,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      engine: { status: "Good", healthPercent: 91 },
      transmission: { status: "Good", healthPercent: 89 }
    })
  },
  {
    id: "bus-010",
    name: "BCP Bus 10",
    plateNumber: "BUS-4530",
    status: "Under Repair",
    mileage: 153700,
    lastServiceDate: "2026-02-08",
    nextServiceDate: "2026-03-20",
    year: 2020,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      suspension: { status: "Urgent", healthPercent: 18 },
      brakes: { status: "Urgent", healthPercent: 22 }
    })
  },
  {
    id: "bus-011",
    name: "BCP Bus 11",
    plateNumber: "BUS-4531",
    status: "Operational",
    mileage: 69320,
    lastServiceDate: "2026-02-27",
    nextServiceDate: "2026-04-27",
    year: 2023,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      electrical: { status: "Good", healthPercent: 90 },
      battery: { status: "Good", healthPercent: 88 }
    })
  },
  {
    id: "bus-012",
    name: "BCP Bus 12",
    plateNumber: "BUS-4532",
    status: "Needs Service",
    mileage: 120880,
    lastServiceDate: "2026-01-30",
    nextServiceDate: "2026-03-30",
    year: 2021,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      cooling: { status: "Due Soon", healthPercent: 46 },
      transmission: { status: "Due Soon", healthPercent: 44 }
    })
  },
  {
    id: "bus-013",
    name: "BCP Bus 13",
    plateNumber: "BUS-4533",
    status: "Operational",
    mileage: 38210,
    lastServiceDate: "2026-03-05",
    nextServiceDate: "2026-05-05",
    year: 2024,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      tires: { status: "Good", healthPercent: 94 },
      brakes: { status: "Good", healthPercent: 87 }
    })
  },
  {
    id: "bus-014",
    name: "BCP Bus 14",
    plateNumber: "BUS-4534",
    status: "Operational",
    mileage: 84560,
    lastServiceDate: "2026-02-12",
    nextServiceDate: "2026-04-12",
    year: 2022,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      engine: { status: "Good", healthPercent: 83 },
      suspension: { status: "Good", healthPercent: 81 }
    })
  },
  {
    id: "bus-015",
    name: "BCP Bus 15",
    plateNumber: "BUS-4535",
    status: "Needs Service",
    mileage: 101420,
    lastServiceDate: "2026-01-18",
    nextServiceDate: "2026-03-18",
    year: 2021,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      electrical: { status: "Urgent", healthPercent: 28 },
      battery: { status: "Due Soon", healthPercent: 49 }
    })
  },
  {
    id: "bus-016",
    name: "BCP Bus 16",
    plateNumber: "BUS-4536",
    status: "Operational",
    mileage: 58940,
    lastServiceDate: "2026-02-28",
    nextServiceDate: "2026-04-28",
    year: 2023,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      cooling: { status: "Good", healthPercent: 84 },
      brakes: { status: "Good", healthPercent: 76 }
    })
  },
  {
    id: "bus-017",
    name: "BCP Bus 17",
    plateNumber: "BUS-4537",
    status: "Under Repair",
    mileage: 166250,
    lastServiceDate: "2026-02-04",
    nextServiceDate: "2026-03-25",
    year: 2020,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      engine: { status: "Urgent", healthPercent: 19 },
      cooling: { status: "Urgent", healthPercent: 24 }
    })
  },
  {
    id: "bus-018",
    name: "BCP Bus 18",
    plateNumber: "BUS-4538",
    status: "Operational",
    mileage: 72110,
    lastServiceDate: "2026-03-02",
    nextServiceDate: "2026-05-02",
    year: 2022,
    model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      transmission: { status: "Good", healthPercent: 85 },
      tires: { status: "Good", healthPercent: 79 }
    })
  }
];

// GET all buses
exports.getAllBuses = async () => {
  return fleet;
};

// GET one bus by id
exports.getBusById = async (id) => {
  return fleet.find((bus) => bus.id === id) || null;
};

// CREATE a new maintenance entry for a component
exports.addMaintenanceEntry = async (busId, componentId, body) => {
  const bus = fleet.find((bus) => bus.id === busId);

  if (!bus) {
    return null;
  }

  const component = bus.components.find((comp) => comp.id === componentId);

  if (!component) {
    return null;
  }

  // Basic validation
  if (!body.type) {
    throw new Error("Maintenance type is required");
  }

  if (!body.description) {
    throw new Error("Description is required");
  }

  if (!body.technician) {
    throw new Error("Technician is required");
  }

  // Create new maintenance entry
  const newEntry = {
    id: body.id || randomUUID(),
    date: body.date || new Date().toISOString().slice(0, 10),
    type: body.type,
    description: body.description,
    technician: body.technician,
    notes: body.notes || null
  };

  // Add new entry to the selected component history
  component.history.unshift(newEntry);

  return newEntry;
};