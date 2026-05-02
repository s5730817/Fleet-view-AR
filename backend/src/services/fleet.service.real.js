const { randomUUID } = require("crypto");
const fleetModel = require("../models/fleet.model");
const {
  resolvePartCode
} = require("../utils/arIssueCatalog");

const componentStatusLabels = {
  good: "Good",
  due_soon: "Due Soon",
  urgent: "Urgent"
};

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

const mapPart = (part, entriesByPartId) => ({
  id: part.id,
  code: resolvePartCode(part.name, part.icon_key),
  name: part.name,
  markerCode: part.marker_code,
  icon: part.icon_key || "Wrench",
  status: componentStatusLabels[part.status] || part.status || "Good",
  lastRepair: formatDate(part.last_repair_at),
  lastService: formatDate(part.last_service_at),
  lastReplacement: formatDate(part.last_replacement_at),
  healthPercent: part.health_percent ?? 0,
  history: entriesByPartId.get(part.id) || [],
  arInstructions: Array.isArray(part.ar_instructions) ? part.ar_instructions : []
});

const mapBus = (bus, partsByBusId, entriesByPartId) => ({
  id: bus.id,
  name: bus.name,
  depotId: bus.depot_id || null,
  depotName: bus.depot_name || null,
  plateNumber: bus.registration_number,
  status: bus.status || "Operational",
  mileage: bus.mileage ?? 0,
  lastServiceDate: formatDate(bus.last_service_at),
  nextServiceDate: formatDate(bus.next_service_at),
  year: bus.year ?? new Date().getFullYear(),
  model: bus.model || "Unknown",
  components: (partsByBusId.get(bus.id) || []).map((part) => mapPart(part, entriesByPartId))
});

const hydrateBuses = async (buses) => {
  const busIds = buses.map((bus) => bus.id);
  const parts = await fleetModel.getPartsForBusIds(busIds);
  const partIds = parts.map((part) => part.id);
  const maintenanceEntries = await fleetModel.getMaintenanceEntriesForPartIds(partIds);
  const issueHistoryEntries = await fleetModel.getIssueHistoryForPartIds(partIds);

  const partsByBusId = new Map();
  for (const part of parts) {
    const busParts = partsByBusId.get(part.bus_id) || [];
    busParts.push(part);
    partsByBusId.set(part.bus_id, busParts);
  }

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

  return buses.map((bus) => mapBus(bus, partsByBusId, entriesByPartId));
};

exports.getAllBuses = async () => {
  const buses = await fleetModel.getAllBuses();
  return hydrateBuses(buses);
};

exports.getBusById = async (id) => {
  const bus = await fleetModel.getBusById(id);

  if (!bus) {
    return null;
  }

  const [hydratedBus] = await hydrateBuses([bus]);
  return hydratedBus || null;
};

exports.getARContext = async (id) => {
  const bus = await fleetModel.getBusById(id);

  if (!bus) {
    return null;
  }

  const parts = await fleetModel.getPartsForBusIds([id]);
  const partCodes = parts.map((part) => resolvePartCode(part.name, part.icon_key));
  const partIds = parts.map((part) => part.id);
  const issues = await fleetModel.getIssuesForPartIds(partIds);
  const issueTypes = await fleetModel.getIssueTypesForPartCodes(partCodes);
  const tools = await fleetModel.getToolsForDepot(bus.depot_id);
  const assignableUsers = await fleetModel.getAssignableUsersForDepot(bus.depot_id);

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

  return {
    bus: {
      id: bus.id,
      name: bus.name,
      plateNumber: bus.registration_number,
      depotId: bus.depot_id || null,
      depotName: bus.depot_name || null,
      status: bus.status || "Operational"
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
        status: componentStatusLabels[part.status] || part.status || "Good",
        healthPercent: part.health_percent ?? 0,
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

exports.addMaintenanceEntry = async (busId, componentId, body) => {
  const bus = await fleetModel.getBusById(busId);

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

  const entry = await fleetModel.createMaintenanceEntry({
    id: body.id || randomUUID(),
    bus_part_id: componentId,
    user_id: body.user_id || null,
    technician_name: body.technician,
    entry_type: body.type,
    description: body.description,
    notes: body.notes || null
  });

  return mapMaintenanceEntry(entry);
};