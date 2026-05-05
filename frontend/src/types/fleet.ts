// This file defines shared TypeScript types for fleet data.
// These types match what the backend returns.

export type BusStatus = "Operational" | "Needs Service" | "Under Repair";

export type ComponentStatus = "Good" | "Due Soon" | "Urgent";

export type HistoryEntryType =
  | "service"
  | "repair"
  | "replacement"
  | "issue"
  | "comment"
  | "status_change"
  | "sign_off"
  | "progress";

export interface MaintenanceEntry {
  id: string;
  date: string;
  type: HistoryEntryType;
  description: string;
  technician: string;
  notes?: string | null;
}

export interface BusComponent {
  id: string;
  code?: string;
  name: string;
  markerCode?: number;
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
  depotId?: string | null;
  depotName?: string | null;
  status: BusStatus;
  mileage: number;
  lastServiceDate: string;
  nextServiceDate: string;
  year: number;
  model: string;
  components: BusComponent[];
}

export interface ARGuide {
  title: string;
  recommendedAction: "repair" | "replacement" | string;
  steps: string[];
  requiredToolTypes: string[];
}

export interface ARIssueTypeOption {
  id: string;
  key: string;
  label: string;
  summary: string;
  priority: "low" | "medium" | "high";
  recommendedAction: "repair" | "replacement" | string;
  guide: ARGuide;
}

export interface ARIssue {
  id: string;
  title: string;
  status: "reported" | "in_progress" | "awaiting_approval" | "resolved" | string;
  priority: "low" | "medium" | "high" | string;
  description: string;
  createdAt: string;
  latestComment: string;
  issueTypeId: string | null;
  issueTypeKey: string | null;
  issueTypeLabel: string;
  recommendedAction: "repair" | "replacement" | string;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToEmail?: string | null;
  guide: ARGuide;
}

export interface ARBusPart {
  id: string;
  code: string;
  name: string;
  markerCode: number;
  icon: string;
  status: ComponentStatus | string;
  healthPercent: number;
  arInstructions: string[];
  issueTypeOptions: ARIssueTypeOption[];
  activeIssues: ARIssue[];
}

export interface ARToolMarker {
  id: string;
  name: string;
  markerCode: number;
  status: "available" | "in_use" | "awaiting_return" | string;
  depotName: string;
}

export interface ARAssignableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface BusARContext {
  bus: {
    id: string;
    name: string;
    plateNumber: string;
    depotId: string | null;
    depotName: string | null;
    status: string;
  };
  parts: ARBusPart[];
  assignableUsers: ARAssignableUser[];
  tools: ARToolMarker[];
}