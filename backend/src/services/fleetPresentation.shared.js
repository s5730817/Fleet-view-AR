const {
  COMPONENT_INDICATOR_LABELS,
  COMPONENT_STATUS_LABELS,
  deriveComponentPresentation,
  deriveBusMaintenanceSummary,
  LIFECYCLE_LABELS,
  normalizeComponentState,
  normalizeLifecycleState,
} = require("../utils/maintenanceStatus");

const buildComponentPresentationFields = ({
  conditionState,
  lifecycleState,
  issues = [],
  lastInspectedAt = null,
  inspectionIntervalDays = null,
}) => {
  const normalizedConditionState = normalizeComponentState({ conditionState });
  const normalizedLifecycleState = normalizeLifecycleState({ lifecycleState });
  const presentation = deriveComponentPresentation({
    conditionState: normalizedConditionState,
    lifecycleState: normalizedLifecycleState,
    issues,
    lastInspectedAt,
    inspectionIntervalDays,
  });

  return {
    status: presentation.status,
    statusState: presentation.statusState,
    statusNote: presentation.statusNote,
    maintenanceIndicator: presentation.maintenanceIndicator,
    activeIssueCount: presentation.activeIssueCount,
    inProgressIssueCount: presentation.inProgressIssueCount,
    conditionState: normalizedConditionState,
    conditionLabel:
      COMPONENT_STATUS_LABELS[normalizedConditionState] ||
      COMPONENT_INDICATOR_LABELS[normalizedConditionState],
    lifecycleState: normalizedLifecycleState,
    lifecycleLabel: LIFECYCLE_LABELS[normalizedLifecycleState],
  };
};

const buildBusMaintenanceFields = ({ nextServiceAt, issues = [], components = [] }) => {
  const maintenanceSummary = deriveBusMaintenanceSummary({
    nextServiceAt,
    issues,
    components,
  });

  return {
    status: maintenanceSummary.status,
    issueIndicator: maintenanceSummary.issueIndicator,
    componentIndicator: maintenanceSummary.componentIndicator,
    serviceIndicator: maintenanceSummary.serviceIndicator,
  };
};

const buildBusMaintenanceStatus = (input) => buildBusMaintenanceFields(input).status;

module.exports = {
  buildComponentPresentationFields,
  buildBusMaintenanceFields,
  buildBusMaintenanceStatus,
};