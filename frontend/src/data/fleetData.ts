export type BusStatus = "Operational" | "Needs Service" | "Under Repair";
export type ComponentStatus = "Good" | "Due Soon" | "Urgent";

export interface MaintenanceEntry {
  id: string;
  date: string;
  type: "repair" | "service" | "replacement";
  description: string;
  technician: string;
  notes?: string;
}

export interface BusComponent {
  id: string;
  name: string;
  icon: string;
  status: ComponentStatus;
  lastRepair: string;
  lastService: string;
  lastReplacement: string;
  healthPercent: number;
  history: MaintenanceEntry[];
  arInstructions: string[];
}

export interface Bus {
  id: string;
  name: string;
  plateNumber: string;
  status: BusStatus;
  mileage: number;
  lastServiceDate: string;
  nextServiceDate: string;
  year: number;
  model: string;
  components: BusComponent[];
}

const createComponent = (
  id: string, name: string, icon: string, status: ComponentStatus,
  lastRepair: string, lastService: string, lastReplacement: string,
  healthPercent: number, history: MaintenanceEntry[], arInstructions: string[]
): BusComponent => ({
  id, name, icon, status, lastRepair, lastService, lastReplacement, healthPercent, history, arInstructions,
});

const defaultComponents: BusComponent[] = [
  createComponent("engine", "Engine", "Cog", "Good", "2025-11-15", "2026-01-10", "2024-06-01", 85, [
    { id: "e1", date: "2026-01-10", type: "service", description: "Oil change and filter replacement", technician: "Mike R." },
    { id: "e2", date: "2025-11-15", type: "repair", description: "Fixed minor oil leak at gasket", technician: "Sarah K." },
  ], ["Locate the engine compartment at the front of the bus", "Open the hood latch on the driver side", "Inspect belt tension and oil levels", "Check coolant reservoir level", "Inspect air filter condition"]),
  createComponent("brakes", "Brakes", "Disc", "Due Soon", "2025-12-20", "2026-01-05", "2025-03-15", 45, [
    { id: "b1", date: "2026-01-05", type: "service", description: "Brake pad inspection - 40% remaining", technician: "Mike R." },
    { id: "b2", date: "2025-12-20", type: "repair", description: "Replaced rear brake caliper", technician: "James T." },
  ], ["Locate brake assembly behind each wheel", "Remove wheel to access brake pads", "Measure pad thickness with calipers", "Inspect rotor surface for scoring", "Check brake fluid level in reservoir"]),
  createComponent("tires", "Tires", "Circle", "Good", "2025-10-01", "2026-02-15", "2025-08-20", 72, [
    { id: "t1", date: "2026-02-15", type: "service", description: "Tire rotation and pressure check", technician: "Sarah K." },
  ], ["Check tire pressure using gauge - target 100 PSI", "Inspect tread depth with penny test", "Look for sidewall damage or bulging", "Check valve stems for leaks", "Verify lug nut torque"]),
  createComponent("battery", "Battery", "Battery", "Good", "2025-09-10", "2026-02-01", "2025-09-10", 90, [
    { id: "ba1", date: "2026-02-01", type: "service", description: "Battery load test - passed", technician: "James T." },
  ], ["Locate battery compartment on driver side", "Check terminal connections for corrosion", "Test voltage with multimeter - target 12.6V", "Inspect battery case for damage", "Clean terminals with baking soda solution"]),
  createComponent("suspension", "Suspension", "ArrowUpDown", "Good", "2025-08-15", "2026-01-20", "2024-12-01", 78, [
    { id: "s1", date: "2026-01-20", type: "service", description: "Suspension inspection - all good", technician: "Mike R." },
  ], ["Inspect shock absorbers for leaks", "Check air bag suspension pressure", "Test ride height at each corner", "Inspect bushings for wear", "Check stabilizer bar links"]),
  createComponent("cooling", "Cooling System", "Thermometer", "Due Soon", "2025-11-01", "2026-01-15", "2024-09-01", 52, [
    { id: "c1", date: "2026-01-15", type: "service", description: "Coolant flush recommended at next service", technician: "Sarah K." },
  ], ["Check coolant level in expansion tank", "Inspect radiator for leaks or damage", "Test thermostat operation", "Check all hose connections", "Inspect water pump for weeping"]),
  createComponent("transmission", "Transmission", "Settings", "Good", "2025-07-20", "2026-02-10", "2024-03-15", 80, [
    { id: "tr1", date: "2026-02-10", type: "service", description: "Transmission fluid level check", technician: "James T." },
  ], ["Check transmission fluid level and color", "Inspect for leaks at pan gasket", "Test shift quality through all gears", "Check linkage adjustment", "Inspect CV joints and boots"]),
  createComponent("electrical", "Electrical Systems", "Zap", "Urgent", "2026-02-28", "2026-02-28", "2025-06-01", 25, [
    { id: "el1", date: "2026-02-28", type: "repair", description: "Intermittent headlight failure - investigating", technician: "Mike R." },
  ], ["Check all exterior lighting", "Test turn signals and hazard lights", "Inspect wiring harness for damage", "Check fuse box for blown fuses", "Test alternator output"]),
];

const adjustComponents = (components: BusComponent[], overrides: Partial<Record<string, Partial<BusComponent>>>): BusComponent[] => {
  return components.map(c => {
    const override = overrides[c.id];
    return override ? { ...c, ...override } : c;
  });
};

export const fleet: Bus[] = [
  {
    id: "bus-001", name: "BCP Bus 1", plateNumber: "BUS-4521", status: "Operational",
    mileage: 124350, lastServiceDate: "2026-02-15", nextServiceDate: "2026-04-15",
    year: 2021, model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {}),
  },
  {
    id: "bus-002", name: "BCP Bus 2", plateNumber: "BUS-4522", status: "Needs Service",
    mileage: 98720, lastServiceDate: "2026-01-10", nextServiceDate: "2026-03-10",
    year: 2022, model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      brakes: { status: "Urgent", healthPercent: 20 },
      cooling: { status: "Urgent", healthPercent: 30 },
    }),
  },
  {
    id: "bus-003", name: "BCP Bus 3", plateNumber: "BUS-4523", status: "Operational",
    mileage: 67890, lastServiceDate: "2026-02-20", nextServiceDate: "2026-04-20",
    year: 2023, model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      electrical: { status: "Good", healthPercent: 88 },
    }),
  },
  {
    id: "bus-004", name: "BCP Bus 4", plateNumber: "BUS-4524", status: "Under Repair",
    mileage: 145200, lastServiceDate: "2026-02-01", nextServiceDate: "2026-03-15",
    year: 2020, model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      engine: { status: "Urgent", healthPercent: 15 },
      transmission: { status: "Due Soon", healthPercent: 40 },
    }),
  },
  {
    id: "bus-005", name: "BCP Bus 5", plateNumber: "BUS-4525", status: "Operational",
    mileage: 31450, lastServiceDate: "2026-03-01", nextServiceDate: "2026-05-01",
    year: 2024, model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      electrical: { status: "Good", healthPercent: 95 },
      cooling: { status: "Good", healthPercent: 92 },
    }),
  },
  {
    id: "bus-006", name: "BCP Bus 6", plateNumber: "BUS-4526", status: "Operational",
    mileage: 52300, lastServiceDate: "2026-02-25", nextServiceDate: "2026-04-25",
    year: 2023, model: "Alexander Dennis Enviro 400 MMC",
    components: adjustComponents(defaultComponents, {
      brakes: { status: "Due Soon", healthPercent: 50 },
    }),
  },
];

export const getDaysAgo = (dateStr: string): number => {
  const date = new Date(dateStr);
  const now = new Date("2026-03-10");
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
};

export const getDaysUntil = (dateStr: string): number => {
  const date = new Date(dateStr);
  const now = new Date("2026-03-10");
  return Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};
