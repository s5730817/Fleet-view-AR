// This file defines shared TypeScript types for fleet data.
// These types match what the backend returns.

export type BusStatus = "Operational" | "Needs Service" | "Under Repair";

export type ComponentStatus = "Good" | "Due Soon" | "Urgent";

export interface MaintenanceEntry {
  id: string;
  date: string;
  type: "service" | "repair" | "replacement";
  description: string;
  technician: string;
  notes?: string | null;
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