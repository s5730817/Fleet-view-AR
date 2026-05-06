const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SERVICE_DUE_SOON_DAYS = 7;

const ACTIVE_ISSUE_STATUSES = new Set([
  "reported",
  "in_progress",
  "awaiting_approval"
]);

const REPAIR_IN_PROGRESS_STATUSES = new Set([
  "in_progress",
  "awaiting_approval"
]);

const ISSUE_BLOCKING_COMPONENT_STATES = new Set([
  "repair_needed",
  "replace_recommended"
]);

const COMPONENT_OUT_OF_LIFE_STATES = new Set([
  "beyond_expected_life",
  "beyond_life_approved"
]);

const COMPONENT_SEVERITY = {
  good: 0,
  watch: 1,
  repair_needed: 2,
  replace_recommended: 3
};

const COMPONENT_STATUS_LABELS = {
  good: "Good",
  watch: "Watch",
  repair_needed: "Repair Needed",
  replace_recommended: "Replace Recommended"
};

const COMPONENT_DISPLAY_STATUS_LABELS = {
  good: "Good",
  requires_attention: "Requires Attention",
  replacement_recommended: "Replacement Recommended",
  needs_replacement: "Needs Replacement!",
  needs_fix_or_replacement: "Needs Fix or Replacement",
  under_repair: "Under Repair"
};

const BUS_STATUS_LABELS = {
  good: "Good",
  requires_attention: "Requires Attention",
  out_of_operation: "Out Of Operation"
};

const COMPONENT_INDICATOR_LABELS = {
  good: "Component health good",
  watch: "Component needs monitoring",
  repair_needed: "Component repair needed",
  replace_recommended: "Replacement recommended"
};

const LIFECYCLE_SEVERITY = {
  within_expected_life: 0,
  near_end_of_life: 1,
  beyond_expected_life: 2,
  beyond_life_approved: 1
};

const LIFECYCLE_LABELS = {
  within_expected_life: "Within expected life",
  near_end_of_life: "Near end of life",
  beyond_expected_life: "Beyond expected life",
  beyond_life_approved: "Beyond life, approved"
};

const normalizeComponentState = ({ conditionState, status }) => {
  const normalizedStatus = typeof conditionState === "string"
    ? conditionState.trim().toLowerCase().replace(/\s+/g, "_")
    : typeof status === "string"
    ? status.trim().toLowerCase().replace(/\s+/g, "_")
    : null;
  return COMPONENT_SEVERITY[normalizedStatus] !== undefined ? normalizedStatus : "good";
};

const normalizeLifecycleState = ({ lifecycleState }) => {
  const normalizedState = typeof lifecycleState === "string"
    ? lifecycleState.trim().toLowerCase().replace(/\s+/g, "_")
    : null;

  return LIFECYCLE_SEVERITY[normalizedState] !== undefined
    ? normalizedState
    : "within_expected_life";
};

const buildComponentIndicator = (components = []) => {
  const normalizedComponents = components.map((component) => {
    const statusState = component.statusState
      || (component.status === COMPONENT_DISPLAY_STATUS_LABELS.under_repair ? "under_repair" : null)
      || (component.status === COMPONENT_DISPLAY_STATUS_LABELS.needs_replacement ? "needs_replacement" : null)
      || (component.status === COMPONENT_DISPLAY_STATUS_LABELS.needs_fix_or_replacement ? "needs_fix_or_replacement" : null)
      || (component.status === COMPONENT_DISPLAY_STATUS_LABELS.replacement_recommended ? "replacement_recommended" : null)
      || (component.status === COMPONENT_DISPLAY_STATUS_LABELS.requires_attention ? "requires_attention" : null)
      || (component.status === COMPONENT_DISPLAY_STATUS_LABELS.good ? "good" : null)
      || deriveComponentPresentation(component).statusState;

    return {
      statusState,
      activeIssueCount: component.activeIssueCount || 0,
      maintenanceIndicator: component.maintenanceIndicator || null
    };
  });

  const outOfOperationCount = normalizedComponents.filter((component) => [
    "under_repair",
    "needs_replacement",
    "needs_fix_or_replacement"
  ].includes(component.statusState)).length;
  const requiresAttentionCount = normalizedComponents.filter((component) => [
    "requires_attention",
    "replacement_recommended"
  ].includes(component.statusState)).length;
  const overdueMaintenanceCount = normalizedComponents.filter((component) => component.maintenanceIndicator?.isOverdue).length;
  const openReportCount = normalizedComponents.filter((component) => component.activeIssueCount > 0).length;
  const replacementCount = normalizedComponents.filter((component) => [
    "replacement_recommended",
    "needs_replacement"
  ].includes(component.statusState)).length;

  if (outOfOperationCount > 0) {
    return {
      state: "out_of_operation",
      label: outOfOperationCount === 1 ? "1 component is out of operation" : `${outOfOperationCount} components are out of operation`,
      requiresAttentionCount,
      outOfOperationCount,
      overdueMaintenanceCount,
      openReportCount,
      replacementCount
    };
  }

  if (requiresAttentionCount > 0) {
    return {
      state: "requires_attention",
      label: requiresAttentionCount === 1 ? "1 component requires attention" : `${requiresAttentionCount} components require attention`,
      requiresAttentionCount,
      outOfOperationCount: 0,
      overdueMaintenanceCount,
      openReportCount,
      replacementCount
    };
  }

  return {
    state: "good",
    label: "Components in good condition",
    requiresAttentionCount: 0,
    outOfOperationCount: 0,
    overdueMaintenanceCount: 0,
    openReportCount: 0,
    replacementCount: 0
  };
};

const toUtcDayStamp = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const addDays = (value, days) => {
  if (!value || typeof days !== "number") {
    return null;
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const getDaysUntil = (value, now = new Date()) => {
  const dueStamp = toUtcDayStamp(value);
  const todayStamp = toUtcDayStamp(now);

  if (dueStamp === null || todayStamp === null) {
    return null;
  }

  return Math.floor((dueStamp - todayStamp) / DAY_IN_MS);
};

const buildServiceIndicator = (nextServiceAt, now = new Date()) => {
  const dueDate = formatDate(nextServiceAt);
  const daysUntilDue = getDaysUntil(nextServiceAt, now);

  if (dueDate === null || daysUntilDue === null) {
    return {
      state: "unscheduled",
      label: "Routine unscheduled",
      dueDate: null,
      daysUntilDue: null,
      isDueSoon: false,
      isOverdue: false
    };
  }

  if (daysUntilDue < 0) {
    return {
      state: "overdue",
      label: "Routine overdue",
      dueDate,
      daysUntilDue,
      isDueSoon: false,
      isOverdue: true
    };
  }

  if (daysUntilDue === 0) {
    return {
      state: "due_today",
      label: "Routine due today",
      dueDate,
      daysUntilDue,
      isDueSoon: true,
      isOverdue: false
    };
  }

  if (daysUntilDue <= SERVICE_DUE_SOON_DAYS) {
    return {
      state: "due_soon",
      label: `Routine due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
      dueDate,
      daysUntilDue,
      isDueSoon: true,
      isOverdue: false
    };
  }

  return {
    state: "ok",
    label: `Routine due in ${daysUntilDue} days`,
    dueDate,
    daysUntilDue,
    isDueSoon: false,
    isOverdue: false
  };
};

const buildComponentMaintenanceIndicator = ({ lastInspectedAt, inspectionIntervalDays, now = new Date() }) => {
  const dueAt = addDays(lastInspectedAt, inspectionIntervalDays);
  const dueDate = formatDate(dueAt);
  const daysUntilDue = getDaysUntil(dueAt, now);

  if (dueDate === null || daysUntilDue === null) {
    return {
      state: "unscheduled",
      label: "Maintenance schedule unavailable",
      dueDate: null,
      daysUntilDue: null,
      isDueSoon: false,
      isOverdue: false
    };
  }

  if (daysUntilDue < 0) {
    return {
      state: "overdue",
      label: "Overdue maintenance",
      dueDate,
      daysUntilDue,
      isDueSoon: false,
      isOverdue: true
    };
  }

  if (daysUntilDue === 0) {
    return {
      state: "due_today",
      label: "Maintenance due today",
      dueDate,
      daysUntilDue,
      isDueSoon: true,
      isOverdue: false
    };
  }

  if (daysUntilDue <= SERVICE_DUE_SOON_DAYS) {
    return {
      state: "due_soon",
      label: `Maintenance due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
      dueDate,
      daysUntilDue,
      isDueSoon: true,
      isOverdue: false
    };
  }

  return {
    state: "ok",
    label: `Maintenance due in ${daysUntilDue} days`,
    dueDate,
    daysUntilDue,
    isDueSoon: false,
    isOverdue: false
  };
};

const formatOpenReportLabel = (count) => count === 1 ? "1 open report" : `${count} open reports`;

const deriveComponentPresentation = ({
  conditionState,
  lifecycleState,
  issues = [],
  lastInspectedAt,
  inspectionIntervalDays,
  now = new Date()
}) => {
  const normalizedConditionState = normalizeComponentState({ conditionState });
  const normalizedLifecycleState = normalizeLifecycleState({ lifecycleState });
  const activeIssues = issues.filter((issue) => ACTIVE_ISSUE_STATUSES.has(issue.status));
  const inProgressCount = activeIssues.filter((issue) => REPAIR_IN_PROGRESS_STATUSES.has(issue.status)).length;
  const maintenanceIndicator = buildComponentMaintenanceIndicator({
    lastInspectedAt,
    inspectionIntervalDays,
    now
  });
  const activeIssueCount = activeIssues.length;
  const isOutOfLife = COMPONENT_OUT_OF_LIFE_STATES.has(normalizedLifecycleState);
  const hasBlockingCondition = ISSUE_BLOCKING_COMPONENT_STATES.has(normalizedConditionState);

  let statusState = "good";
  let statusNote = maintenanceIndicator.state === "ok" ? maintenanceIndicator.label : null;

  if (inProgressCount > 0) {
    statusState = "under_repair";
    statusNote = inProgressCount === 1 ? "Repair in progress" : `${inProgressCount} repairs in progress`;
  } else if (isOutOfLife && hasBlockingCondition) {
    statusState = "needs_replacement";
    statusNote = "Out of life expectancy";
  } else if (hasBlockingCondition) {
    statusState = "needs_fix_or_replacement";
    statusNote = activeIssueCount > 0 ? formatOpenReportLabel(activeIssueCount) : "Fault reported on this component";
  } else if (isOutOfLife) {
    statusState = "replacement_recommended";
    statusNote = normalizedLifecycleState === "beyond_life_approved"
      ? "Beyond life expectancy, temporarily approved"
      : "Out of life expectancy";
  } else if (maintenanceIndicator.isOverdue) {
    statusState = "requires_attention";
    statusNote = "Overdue maintenance";
  } else if (activeIssueCount > 0) {
    statusState = "requires_attention";
    statusNote = formatOpenReportLabel(activeIssueCount);
  } else if (normalizedLifecycleState === "near_end_of_life") {
    statusState = "requires_attention";
    statusNote = "Near end of life";
  } else if (normalizedConditionState === "watch") {
    statusState = "requires_attention";
    statusNote = "Needs inspection";
  }

  return {
    statusState,
    status: COMPONENT_DISPLAY_STATUS_LABELS[statusState],
    statusNote,
    maintenanceIndicator,
    activeIssueCount,
    inProgressIssueCount: inProgressCount,
    conditionState: normalizedConditionState,
    lifecycleState: normalizedLifecycleState
  };
};

const buildIssueIndicator = (issues = [], components = []) => {
  const activeIssues = issues.filter((issue) => ACTIVE_ISSUE_STATUSES.has(issue.status));
  const inProgressCount = activeIssues.filter((issue) => REPAIR_IN_PROGRESS_STATUSES.has(issue.status)).length;
  const hasBlockingComponentState = components.some((component) =>
    ISSUE_BLOCKING_COMPONENT_STATES.has(normalizeComponentState(component))
  );

  if (inProgressCount > 0) {
    return {
      state: "under_repair",
      label: "Under repair",
      activeCount: activeIssues.length,
      inProgressCount
    };
  }

  if (activeIssues.length > 0 && hasBlockingComponentState) {
    return {
      state: "needs_fix",
      label: "Needs a fix!",
      activeCount: activeIssues.length,
      inProgressCount: 0
    };
  }

  if (activeIssues.length > 0) {
    return {
      state: "open_reports",
      label: activeIssues.length === 1 ? "1 open report" : `${activeIssues.length} open reports`,
      activeCount: activeIssues.length,
      inProgressCount: 0
    };
  }

  return {
    state: "none",
    label: "No active issues",
    activeCount: 0,
    inProgressCount: 0
  };
};

const deriveBusMaintenanceSummary = ({ nextServiceAt, issues = [], components = [], now = new Date() }) => {
  const issueIndicator = buildIssueIndicator(issues, components);
  const serviceIndicator = buildServiceIndicator(nextServiceAt, now);
  const componentIndicator = buildComponentIndicator(components);

  let status = BUS_STATUS_LABELS.good;
  if (componentIndicator.state === "out_of_operation") {
    status = BUS_STATUS_LABELS.out_of_operation;
  } else if (componentIndicator.state === "requires_attention" || serviceIndicator.state === "overdue") {
    status = BUS_STATUS_LABELS.requires_attention;
  }

  return {
    status,
    issueIndicator,
    componentIndicator,
    serviceIndicator
  };
};

module.exports = {
  BUS_STATUS_LABELS,
  COMPONENT_DISPLAY_STATUS_LABELS,
  COMPONENT_INDICATOR_LABELS,
  COMPONENT_STATUS_LABELS,
  LIFECYCLE_LABELS,
  SERVICE_DUE_SOON_DAYS,
  buildComponentMaintenanceIndicator,
  deriveComponentPresentation,
  deriveBusMaintenanceSummary,
  getDaysUntil,
  normalizeLifecycleState,
  normalizeComponentState,
  toUtcDayStamp
};