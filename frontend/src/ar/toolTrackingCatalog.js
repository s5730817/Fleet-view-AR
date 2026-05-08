const SHARED_TOOL_MARKERS = [
  { markerCode: 500, name: "Diagnostic Scanner" },
  { markerCode: 501, name: "Torque Wrench" },
  { markerCode: 502, name: "Wrench" },
  { markerCode: 503, name: "Drill" },
  { markerCode: 504, name: "Brake Caliper Tool" },
  { markerCode: 505, name: "Hydraulic Jack" },
  { markerCode: 506, name: "Battery Tester" },
  { markerCode: 507, name: "Coolant Pressure Tester" },
  { markerCode: 508, name: "Multimeter" },
];

const toolByMarkerCode = new Map(SHARED_TOOL_MARKERS.map((tool) => [tool.markerCode, tool]));
const toolByName = new Map(SHARED_TOOL_MARKERS.map((tool) => [tool.name.toLowerCase(), tool]));

export const buildTrackedDepotTools = (tools = [], depotName) => {
  const normalizedTools = tools
    .map((tool, index) => {
      const markerMatch = typeof tool.markerCode === "number" ? toolByMarkerCode.get(tool.markerCode) : null;
      const nameMatch = typeof tool.name === "string" ? toolByName.get(tool.name.toLowerCase()) : null;
      const matchedTool = markerMatch || nameMatch;

      if (!matchedTool) {
        return null;
      }

      return {
        ...tool,
        id: tool.id || `tool-marker-${matchedTool.markerCode}-${index}`,
        name: matchedTool.name,
        markerCode: matchedTool.markerCode,
        depotName: tool.depotName || depotName || "Depot",
        status: tool.status || "available",
      };
    })
    .filter(Boolean);

  return Array.from(
    normalizedTools.reduce((toolMap, tool) => {
      if (!toolMap.has(tool.markerCode)) {
        toolMap.set(tool.markerCode, tool);
      }

      return toolMap;
    }, new Map()).values(),
  ).sort((left, right) => left.markerCode - right.markerCode);
};

export { SHARED_TOOL_MARKERS };