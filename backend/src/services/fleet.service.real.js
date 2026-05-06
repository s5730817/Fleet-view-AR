const { randomUUID } = require("crypto");
const authModel = require("../models/auth.model");
const fleetModel = require("../models/fleet.model");
const {
  resolvePartCode
} = require("../utils/arIssueCatalog");
const {
  COMPONENT_INDICATOR_LABELS,
  COMPONENT_STATUS_LABELS,
  deriveComponentPresentation,
  deriveBusMaintenanceSummary,
  LIFECYCLE_LABELS,
  normalizeLifecycleState,
  normalizeComponentState
} = require("../utils/maintenanceStatus");

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
};

const mapMaintenanceEntry = (entry) => ({
  id: entry.id,
  date: formatDate(entry.created_at),
  type: entry.entry_type,
  description: entry.description,
  technician: entry.technician,
  notes: entry.notes || null
});

const mapIssueHistoryEntry = (entry) => ({
  id: entry.id,
  date: formatDate(entry.created_at),
  type: entry.history_type,
  description: entry.description,
  technician: entry.actor_name || "System",
  notes: null
});

const resolveUserScope = async (user) => {
  const fallbackRole = typeof user?.role === "string" ? user.role.trim().toLowerCase() : null;

  if (fallbackRole === "admin") {
    return {
      role: "admin",
      depotId: null,
      restrictToDepot: false
    };
  }

  if (!user?.id) {
    return {
      role: fallbackRole,
      depotId: null,
      restrictToDepot: fallbackRole !== "admin"
    };
  }

  const persistedUser = await authModel.getUserById(user.id);
  const role = typeof persistedUser?.role === "string"
    ? persistedUser.role.trim().toLowerCase()
    : fallbackRole;

  return {
    role,
    depotId: persistedUser?.depot_id || null,
    restrictToDepot: role !== "admin"
  };
};

const mapPart = (part, entriesByPartId, issuesByPartId, policyByPartCode) => {
  const partCode = resolvePartCode(part.name, part.icon_key);
  const activeIssues = issuesByPartId.get(part.id) || [];
  const lifecyclePolicy = policyByPartCode.get(partCode) || null;
  const presentation = deriveComponentPresentation({
    conditionState: part.condition_state,
    lifecycleState: part.lifecycle_state,
    issues: activeIssues,
    lastInspectedAt: part.last_inspected_at,
    inspectionIntervalDays: lifecyclePolicy?.usage_model === "inspection"
      ? lifecyclePolicy.inspection_interval_days ?? null
      : null
  });
  const normalizedState = normalizeComponentState({
    conditionState: part.condition_state
  });
  const normalizedLifecycleState = normalizeLifecycleState({
    lifecycleState: part.lifecycle_state
  });

  return {
    id: part.id,
    code: partCode,
    name: part.name,
    markerCode: part.marker_code,
    icon: part.icon_key || "Wrench",
    status: presentation.status,
    statusState: presentation.statusState,
    statusNote: presentation.statusNote,
    conditionState: normalizedState,
    conditionLabel: COMPONENT_STATUS_LABELS[normalizedState] || COMPONENT_INDICATOR_LABELS[normalizedState],
    lifecycleState: normalizedLifecycleState,
    lifecycleLabel: LIFECYCLE_LABELS[normalizedLifecycleState],
    maintenanceIndicator: presentation.maintenanceIndicator,
    activeIssueCount: presentation.activeIssueCount,
    inProgressIssueCount: presentation.inProgressIssueCount,
    lastRepair: formatDate(part.last_repair_at),
    lastInspected: formatDate(part.last_inspected_at),
    lastService: formatDate(part.last_service_at),
    lastReplacement: formatDate(part.last_replacement_at),
    history: entriesByPartId.get(part.id) || [],
    arInstructions: Array.isArray(part.ar_instructions) ? part.ar_instructions : []
  };
};

const mapBus = (bus, partsByBusId, entriesByPartId, issuesByPartId, policyByPartCode, issues) => {
  const mappedParts = (partsByBusId.get(bus.id) || []).map((part) => mapPart(part, entriesByPartId, issuesByPartId, policyByPartCode));
  const maintenanceSummary = deriveBusMaintenanceSummary({
    nextServiceAt: bus.next_service_at,
    issues,
    components: mappedParts
  });

  return {
    id: bus.id,
    name: bus.name,
    depotId: bus.depot_id || null,
    depotName: bus.depot_name || null,
    plateNumber: bus.registration_number,
    status: maintenanceSummary.status,
    mileage: bus.mileage ?? 0,
    lastServiceDate: formatDate(bus.last_service_at),
    nextServiceDate: formatDate(bus.next_service_at),
    year: bus.year ?? new Date().getFullYear(),
    model: bus.model || "Unknown",
    issueIndicator: maintenanceSummary.issueIndicator,
    componentIndicator: maintenanceSummary.componentIndicator,
    serviceIndicator: maintenanceSummary.serviceIndicator,
    components: mappedParts
  };
};

const hydrateBuses = async (buses) => {
  const busIds = buses.map((bus) => bus.id);
  const parts = await fleetModel.getPartsForBusIds(busIds);
  const policyPartCodes = [...new Set(parts.map((part) => resolvePartCode(part.name, part.icon_key)).filter(Boolean))];
  const lifecyclePolicies = await fleetModel.getLifecyclePoliciesForPartCodes(policyPartCodes);
  const partIds = parts.map((part) => part.id);
  const maintenanceEntries = await fleetModel.getMaintenanceEntriesForPartIds(partIds);
  const issueHistoryEntries = await fleetModel.getIssueHistoryForPartIds(partIds);
  const issues = await fleetModel.getIssuesForPartIds(partIds);

  const partsByBusId = new Map();
  for (const part of parts) {
    const busParts = partsByBusId.get(part.bus_id) || [];
    busParts.push(part);
    partsByBusId.set(part.bus_id, busParts);
  }

  const busIdByPartId = new Map(parts.map((part) => [part.id, part.bus_id]));
  const issuesByBusId = new Map();
  const issuesByPartId = new Map();
  for (const issue of issues) {
    const busId = busIdByPartId.get(issue.bus_part_id);
    if (!busId) {
      continue;
    }

    const busIssues = issuesByBusId.get(busId) || [];
    busIssues.push(issue);
    issuesByBusId.set(busId, busIssues);

    const partIssues = issuesByPartId.get(issue.bus_part_id) || [];
    partIssues.push(issue);
    issuesByPartId.set(issue.bus_part_id, partIssues);
  }

  const policyByPartCode = new Map(lifecyclePolicies.map((policy) => [policy.part_code, policy]));

  const entriesByPartId = new Map();
  for (const entry of maintenanceEntries) {
    const history = entriesByPartId.get(entry.bus_part_id) || [];
    history.push(mapMaintenanceEntry(entry));
    entriesByPartId.set(entry.bus_part_id, history);
  }

  for (const entry of issueHistoryEntries) {
    const history = entriesByPartId.get(entry.bus_part_id) || [];
    history.push(mapIssueHistoryEntry(entry));
    history.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
    entriesByPartId.set(entry.bus_part_id, history);
  }

  return buses.map((bus) => mapBus(
    bus,
    partsByBusId,
    entriesByPartId,
    issuesByPartId,
    policyByPartCode,
    issuesByBusId.get(bus.id) || []
  ));
};

exports.getAllBuses = async (user) => {
  const scope = await resolveUserScope(user);
  if (scope.restrictToDepot && !scope.depotId) {
    return [];
  }

  const buses = await fleetModel.getAllBuses({
    depotId: scope.restrictToDepot ? scope.depotId : null
  });
  return hydrateBuses(buses);
};

exports.getBusById = async (id, user) => {
  const scope = await resolveUserScope(user);
  if (scope.restrictToDepot && !scope.depotId) {
    return null;
  }

  const bus = await fleetModel.getBusById(id, {
    depotId: scope.restrictToDepot ? scope.depotId : null
  });

  if (!bus) {
    return null;
  }

  const [hydratedBus] = await hydrateBuses([bus]);
  return hydratedBus || null;
};

exports.getARContext = async (id, user) => {
  const scope = await resolveUserScope(user);
  if (scope.restrictToDepot && !scope.depotId) {
    return null;
  }

  const bus = await fleetModel.getBusById(id, {
    depotId: scope.restrictToDepot ? scope.depotId : null
  });

  if (!bus) {
    return null;
  }

  const parts = await fleetModel.getPartsForBusIds([id]);
  const partCodes = parts.map((part) => resolvePartCode(part.name, part.icon_key));
  const partIds = parts.map((part) => part.id);
  const issues = await fleetModel.getIssuesForPartIds(partIds);
  const issueTypes = await fleetModel.getIssueTypesForPartCodes(partCodes);
  const lifecyclePolicies = await fleetModel.getLifecyclePoliciesForPartCodes(partCodes);
  const tools = await fleetModel.getToolsForDepot(bus.depot_id);
  const assignableUsers = await fleetModel.getAssignableUsersForDepot(
    scope.role === "admin" ? null : bus.depot_id
  );

  const buildGuideFromIssueType = (issueType, partInstructions = []) => ({
    title: issueType?.guide_title || "Inspection Guide",
    recommendedAction: issueType?.recommended_action || "repair",
    steps: Array.isArray(issueType?.guide_steps) && issueType.guide_steps.length > 0
      ? [...issueType.guide_steps, ...partInstructions.slice(0, 2)]
      : [...partInstructions],
    requiredToolTypes: Array.isArray(issueType?.required_tool_types) ? issueType.required_tool_types : []
  });

  const issueTypesByPartCode = new Map();
  for (const issueType of issueTypes) {
    const existing = issueTypesByPartCode.get(issueType.part_code) || [];
    existing.push(issueType);
    issueTypesByPartCode.set(issueType.part_code, existing);
  }

  const issuesByPartId = new Map();
  for (const issue of issues) {
    const partIssues = issuesByPartId.get(issue.bus_part_id) || [];
    partIssues.push(issue);
    issuesByPartId.set(issue.bus_part_id, partIssues);
  }

  const policyByPartCode = new Map(lifecyclePolicies.map((policy) => [policy.part_code, policy]));

  return {
    bus: {
      id: bus.id,
      name: bus.name,
      plateNumber: bus.registration_number,
      depotId: bus.depot_id || null,
      depotName: bus.depot_name || null,
      status: deriveBusMaintenanceSummary({
        nextServiceAt: bus.next_service_at,
        issues,
        components: parts.map((part) => ({
          conditionState: part.condition_state,
          lifecycleState: part.lifecycle_state
        }))
      }).status
    },
    parts: parts.map((part) => {
      const partCode = resolvePartCode(part.name, part.icon_key);
      const partInstructions = Array.isArray(part.ar_instructions) ? part.ar_instructions : [];
      const issueTypeOptions = [
        ...(issueTypesByPartCode.get(partCode) || []),
        ...(partCode === "generic" ? [] : (issueTypesByPartCode.get("generic") || []))
      ].map((issueType) => ({
        id: issueType.id,
        key: issueType.code,
        label: issueType.label,
        summary: issueType.summary || "",
        priority: issueType.default_priority || "medium",
        recommendedAction: issueType.recommended_action || "repair",
        guide: buildGuideFromIssueType(issueType, partInstructions)
      }));

      return {
        id: part.id,
        code: partCode,
        name: part.name,
        markerCode: part.marker_code,
        icon: part.icon_key || "Wrench",
        status: deriveComponentPresentation({
          conditionState: part.condition_state,
          lifecycleState: part.lifecycle_state,
          issues: issuesByPartId.get(part.id) || [],
          lastInspectedAt: part.last_inspected_at,
          inspectionIntervalDays: policyByPartCode.get(partCode)?.usage_model === "inspection"
            ? policyByPartCode.get(partCode)?.inspection_interval_days ?? null
            : null
        }).status,
        conditionState: normalizeComponentState({
          conditionState: part.condition_state
        }),
        conditionLabel: COMPONENT_STATUS_LABELS[normalizeComponentState({
          conditionState: part.condition_state
        })] || "Good",
        lifecycleState: normalizeLifecycleState({
          lifecycleState: part.lifecycle_state
        }),
        lifecycleLabel: LIFECYCLE_LABELS[normalizeLifecycleState({
          lifecycleState: part.lifecycle_state
        })],
        arInstructions: partInstructions,
        issueTypeOptions,
        activeIssues: (issuesByPartId.get(part.id) || []).map((issue) => {
          const matchingIssueType = issueTypeOptions.find((issueType) => issueType.id === issue.issue_type_id)
            || issueTypeOptions.find((issueType) => issueType.key === issue.issue_type_code)
            || null;

          return {
            id: issue.id,
            title: issue.title,
            status: issue.status || "reported",
            priority: issue.priority || "medium",
            description: issue.description || "",
            createdAt: issue.created_at,
            latestComment: issue.latest_comment || "",
            issueTypeId: issue.issue_type_id || matchingIssueType?.id || null,
            issueTypeKey: matchingIssueType?.key || issue.issue_type_code || null,
            issueTypeLabel: matchingIssueType?.label || issue.issue_type_label || "Inspection Required",
            recommendedAction: matchingIssueType?.recommendedAction || issue.issue_type_recommended_action || "repair",
            assignedTo: issue.assigned_to || null,
            assignedToName: issue.assigned_to_name || null,
            assignedToEmail: issue.assigned_to_email || null,
            guide: matchingIssueType?.guide || {
              title: `${part.name} Inspection Guide`,
              recommendedAction: "repair",
              steps: partInstructions,
              requiredToolTypes: []
            }
          };
        })
      };
    }),
    assignableUsers: assignableUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    })),
    tools: tools.map((tool) => ({
      id: tool.id,
      name: tool.tool_name,
      markerCode: tool.marker_code,
      status: tool.status || "available",
      depotName: tool.depot_name || bus.depot_name || "Depot"
    }))
  };
};

exports.addMaintenanceEntry = async (busId, componentId, body, user) => {
  const scope = await resolveUserScope(user);
  if (scope.restrictToDepot && !scope.depotId) {
    return null;
  }

  const bus = await fleetModel.getBusById(busId, {
    depotId: scope.restrictToDepot ? scope.depotId : null
  });

  if (!bus) {
    return null;
  }

  const parts = await fleetModel.getPartsForBusIds([busId]);
  const component = parts.find((part) => part.id === componentId);

  if (!component) {
    return null;
  }

  if (!body.type) {
    throw new Error("Maintenance type is required");
  }

  if (!body.description) {
    throw new Error("Description is required");
  }

  if (!body.technician) {
    throw new Error("Technician is required");
  }

  const entry = await require("../database/db").withTransaction(async (client) => {
    const createdEntry = await fleetModel.createMaintenanceEntry({
      id: randomUUID(),
      bus_part_id: componentId,
      user_id: body.user_id || null,
      technician_name: body.technician,
      entry_type: body.type,
      description: body.description,
      notes: body.notes || null
    }, client);

    await fleetModel.updatePartLifecycleAfterMaintenance(componentId, body.type, client);
    await fleetModel.resolveActiveIssuesForPart({
      partId: componentId,
      createdBy: body.user_id || null,
      note: `Issue resolved through ${body.type} entry by ${body.technician}`
    }, client);

    return createdEntry;
  });

  return mapMaintenanceEntry(entry);
};