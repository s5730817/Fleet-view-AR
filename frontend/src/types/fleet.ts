// This file defines shared TypeScript types for fleet data.
// These types match what the backend returns.

export type BusStatus = "Good" | "Requires Attention" | "Out Of Operation";

export type ComponentStatus =
  | "Good"
  | "Requires Attention"
  | "Replacement Recommended"
  | "Needs Replacement!"
  | "Needs Fix or Replacement"
  | "Under Repair";

export type IssueIndicatorState = "none" | "open_reports" | "needs_fix" | "under_repair";

export type ServiceIndicatorState =
  | "ok"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "unscheduled";

export type ComponentIndicatorState = "good" | "repair_needed" | "replace_recommended";

export type ComponentDisplayState =
  | "good"
  | "requires_attention"
  | "replacement_recommended"
  | "needs_replacement"
  | "needs_fix_or_replacement"
  | "under_repair";

export type BusComponentSummaryState = "good" | "requires_attention" | "out_of_operation";

export type LifecycleState =
  | "within_expected_life"
  | "near_end_of_life"
  | "beyond_expected_life"
  | "beyond_life_approved";

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
  statusState: ComponentDisplayState;
  statusNote?: string | null;
  conditionState: ComponentIndicatorState;
  conditionLabel: string;
  lifecycleState: LifecycleState;
  lifecycleLabel: string;
  maintenanceIndicator: BusServiceIndicator;
  activeIssueCount: number;
  inProgressIssueCount: number;
  lastRepair: string;
  lastInspected?: string;
  lastService: string;
  lastReplacement: string;
  history: MaintenanceEntry[];
  arInstructions: string[];
}

export interface BusIssueIndicator {
  state: IssueIndicatorState;
  label: string;
  activeCount: number;
  inProgressCount: number;
}

export interface BusServiceIndicator {
  state: ServiceIndicatorState;
  label: string;
  dueDate: string | null;
  daysUntilDue: number | null;
  isDueSoon: boolean;
  isOverdue: boolean;
}

export interface BusComponentIndicator {
  state: BusComponentSummaryState;
  label: string;
  requiresAttentionCount: number;
  outOfOperationCount: number;
  overdueMaintenanceCount: number;
  openReportCount: number;
  replacementCount: number;
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
  issueIndicator: BusIssueIndicator;
  componentIndicator: BusComponentIndicator;
  serviceIndicator: BusServiceIndicator;
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
  maintenanceIndicator: BusServiceIndicator;
  conditionState: ComponentIndicatorState;
  conditionLabel: string;
  lifecycleState: LifecycleState;
  lifecycleLabel: string;
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