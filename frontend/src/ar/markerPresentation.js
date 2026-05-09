export const MARKER_TONES = {
  UNKNOWN: "unknown",
  GOOD: "good",
  WARNING: "warning",
  CRITICAL: "critical",
  TOOL: "tool",
};

export const getPartMarkerTone = (status) => {
  switch (status) {
    case "Good":
      return MARKER_TONES.GOOD;
    case "Requires Attention":
    case "Replacement Recommended":
      return MARKER_TONES.WARNING;
    case "Under Repair":
    case "Needs Replacement!":
    case "Needs Fix or Replacement":
      return MARKER_TONES.CRITICAL;
    default:
      return MARKER_TONES.WARNING;
  }
};

export const getToolMarkerTone = (status) => {
  switch (status) {
    case "available":
      return MARKER_TONES.GOOD;
    case "in_use":
    case "awaiting_return":
    case "maintenance":
      return MARKER_TONES.CRITICAL;
    default:
      return MARKER_TONES.CRITICAL;
  }
};

export const getMarkerTone = (markerType, status, assigned = true) => {
  if (!assigned || !markerType) {
    return MARKER_TONES.UNKNOWN;
  }

  if (markerType === "part") {
    return getPartMarkerTone(status);
  }

  if (markerType === "tool") {
    return getToolMarkerTone(status);
  }

  return MARKER_TONES.UNKNOWN;
};

export const getMarkerToneColorToken = (tone) => {
  switch (tone) {
    case MARKER_TONES.GOOD:
      return { cssVar: "--status-good", fallback: "#22c55e" };
    case MARKER_TONES.WARNING:
      return { cssVar: "--status-service", fallback: "#f59e0b" };
    case MARKER_TONES.CRITICAL:
      return { cssVar: "--status-urgent", fallback: "#ef4444" };
    case MARKER_TONES.TOOL:
      return { cssVar: "--status-tool", fallback: "#3b82f6" };
    default:
      return { cssVar: "--muted-foreground", fallback: "#94a3b8" };
  }
};

export const maintenanceLegendSections = [
  {
    title: "Maintenance status",
    items: [
      { tone: MARKER_TONES.GOOD, label: "Green", description: "OK" },
      { tone: MARKER_TONES.WARNING, label: "Yellow", description: "Due soon" },
      { tone: MARKER_TONES.CRITICAL, label: "Red", description: "Needs repair" },
      { tone: MARKER_TONES.TOOL, label: "Blue", description: "Nearby tool" },
    ],
  },
];

export const toolLegendSections = [
  {
    title: "Tool availability",
    items: [
      { tone: MARKER_TONES.GOOD, label: "Green", description: "Tool is free" },
      { tone: MARKER_TONES.CRITICAL, label: "Red", description: "Tool is taken or unavailable" },
    ],
  },
];