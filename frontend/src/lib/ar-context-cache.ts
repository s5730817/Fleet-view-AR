import type {
  ARCatalog,
  ARBusPart,
  ARIssueTypeOption,
  BusARContext,
  BusARSnapshot,
} from "@/types/fleet";

const buildIssueTypeOptions = (partCode: string, catalog: ARCatalog) => {
  const partSpecific = catalog.issueTypesByPartCode[partCode] || [];
  const generic = partCode === "generic" ? [] : (catalog.issueTypesByPartCode.generic || []);

  return [...partSpecific, ...generic];
};

const buildFallbackGuide = (partName: string, partInstructions: string[]) => ({
  title: `${partName} Inspection Guide`,
  recommendedAction: "repair",
  steps: partInstructions,
  requiredToolTypes: [],
});

export const composeBusARContext = (snapshot: BusARSnapshot, catalog: ARCatalog): BusARContext => {
  const depotResources = snapshot.bus.depotId
    ? catalog.depotResourcesById[snapshot.bus.depotId]
    : undefined;

  const parts: ARBusPart[] = snapshot.parts.map((part) => {
    const issueTypeOptions = buildIssueTypeOptions(part.code, catalog);

    return {
      ...part,
      issueTypeOptions,
      activeIssues: part.activeIssues.map((issue) => {
        const matchingIssueType = issueTypeOptions.find((issueType) => issueType.id === issue.issueTypeId)
          || issueTypeOptions.find((issueType) => issueType.key === issue.issueTypeKey)
          || null;

        return {
          ...issue,
          guide: matchingIssueType?.guide || buildFallbackGuide(part.name, part.arInstructions),
        };
      }),
    };
  });

  return {
    bus: snapshot.bus,
    parts,
    assignableUsers: depotResources?.assignableUsers || [],
    tools: depotResources?.tools || [],
  };
};