import { useMemo, useState } from "react";
import { usePermission } from "@/context/PermissionContext";
import { useToast } from "@/hooks/use-toast";
import { addMaintenanceEntry, createFault, updateFaultStatus } from "@/lib/api";
import { APP_STATES } from "./constants";
import { useAREngine } from "./hooks/useAREngine";
import { useARTracking } from "./hooks/useARTracking";
import { buildTrackedDepotTools } from "./toolTrackingCatalog";
import { TrackingView } from "./views/TrackingView";
import { ToolTrackingView } from "./views/ToolTrackingView";

/**
 * Root application component — thin orchestrator.
 *
 * Composes all domain hooks and routes to the correct view based on
 * appState.  No business logic lives here other than the navigation
 * callbacks that wire the hooks together.
 *
 * State owned here:
 *   appState          - which screen is visible
 *   showCapturedOnly  - tracking filter toggle
 */
export default function ARInterface({ arContext, onExit, onIssueCreated, mode = "maintenance" }) {
  const [showDetectedOnly, setShowDetectedOnly] = useState(false);

  const { hasPermission, role } = usePermission();
  const { toast } = useToast();
  const { arReady, arError } = useAREngine();
  const trackedDepotTools = useMemo(
    () => buildTrackedDepotTools(arContext.tools, arContext.bus?.depotName),
    [arContext.tools, arContext.bus?.depotName],
  );
  const markers = useMemo(
    () => {
      const toolMarkers = trackedDepotTools.map((tool) => ({
        barcodeValue: tool.markerCode,
        name: tool.name,
        status: tool.status,
        description: `${tool.depotName} · ${tool.status}`,
        issuePoints: [],
        markerType: "tool",
      }));

      if (mode === "tool-tracker") {
        return toolMarkers;
      }

      return [
        ...arContext.parts.map((part) => ({
          barcodeValue: part.markerCode,
          name: part.name,
          status: part.status,
          description: `${part.conditionLabel} · ${part.lifecycleLabel}`,
          issuePoints: part.activeIssues,
          markerType: "part",
        })),
        ...toolMarkers,
      ];
    },
    [arContext.parts, trackedDepotTools, mode],
  );
  const tracking = useARTracking({
    appState: APP_STATES.TRACKING,
    arReady,
    markers,
    mode,
    showCapturedOnly: showDetectedOnly,
  });
  const canCreate = hasPermission("create");
  const aimedPart = useMemo(
    () => arContext.parts.find((part) => part.markerCode === tracking.centeredMarker?.id) || null,
    [arContext.parts, tracking.centeredMarker],
  );

  if (mode === "tool-tracker") {
    return (
      <ToolTrackingView
        arContainerRef={tracking.arContainerRef}
        bus={arContext.bus}
        tools={trackedDepotTools}
        trackingMessage={tracking.trackingMessage}
        detectedMarkers={tracking.detectedMarkers}
        arError={tracking.cameraError || arError}
        onExit={onExit}
      />
    );
  }

  const getStoredUser = () => {
    try {
      return JSON.parse(window.localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const handleCreateIssue = async ({ partId, issueTypeId, assignedUserId, note }) => {
    try {
      const part = arContext.parts.find((entry) => entry.id === partId);

      if (!part) {
        throw new Error("The selected bus part could not be found.");
      }

      const issueType = part.issueTypeOptions.find((entry) => entry.id === issueTypeId);

      if (!issueType) {
        throw new Error("Choose an issue type before creating the AR issue.");
      }

      await createFault({
        title: `${part.name}: ${issueType.label}`,
        description: `${issueType.summary}\n\nBus: ${arContext.bus.name} (${arContext.bus.plateNumber})\nPart marker: ${part.markerCode}`,
        priority: issueType.priority,
        bus_part_id: part.id,
        issue_type_id: issueType.id,
        assigned_user_id: assignedUserId || undefined,
        source: "ar_scan",
        initial_note: note?.trim() || undefined,
        offline_context: {
          busId: arContext.bus.id,
          busName: arContext.bus.name,
        },
      });

      await onIssueCreated?.();

      toast({
        title: "AR issue created",
        description: `${issueType.label} was added to ${part.name}.`,
      });
    } catch (error) {
      toast({
        title: "Failed to create issue",
        description: error instanceof Error ? error.message : "The AR issue could not be saved.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleBeginRepair = async ({ partId, issueId }) => {
    const storedUser = getStoredUser();

    await updateFaultStatus(
      issueId,
      {
        status: "in_progress",
      },
      {
        busId: arContext.bus.id,
        busName: arContext.bus.name,
      }
    );

    await onIssueCreated?.();

    toast({
      title: "Repair started",
      description: "Tool tracking and repair steps are now active.",
    });
  };

  const handleCompleteMaintenance = async ({ partId, issue }) => {
    const storedUser = getStoredUser();
    const entryType = issue.recommendedAction === "replacement" ? "replacement" : "repair";

    await addMaintenanceEntry(arContext.bus.id, partId, {
      type: entryType,
      description: `AR ${entryType} sign-off for ${issue.title}`,
      user_id: storedUser.id,
      resolved_issue_ids: [issue.id],
      notes: `Completed in AR mode using guide: ${issue.guide.title}`,
    }, {
      busName: arContext.bus.name,
    });

    await onIssueCreated?.();

    toast({
      title: entryType === "replacement" ? "Replacement signed off" : "Repair signed off",
      description: `${issue.title} was completed in AR mode.`,
    });
  };

  const handleApprovePart = async ({ partId, part, note }) => {
    const storedUser = getStoredUser();

    await addMaintenanceEntry(arContext.bus.id, partId, {
      type: "service",
      description: `AR inspection approval for ${part.name}`,
      user_id: storedUser.id,
      notes: note?.trim() || `Approved in AR mode with no new issue found. Previous maintenance state: ${part.maintenanceIndicator.label}`,
    }, {
      busName: arContext.bus.name,
    });

    await onIssueCreated?.();

    toast({
      title: "Part approved",
      description: `${part.name} was approved and its maintenance due date was reset.`,
    });
  };

  return (
    <TrackingView
      arContainerRef={tracking.arContainerRef}
      bus={arContext.bus}
      parts={arContext.parts}
      assignableUsers={arContext.assignableUsers}
      tools={arContext.tools}
      role={role}
      trackingMessage={tracking.trackingMessage}
      detectedMarkers={tracking.detectedMarkers}
      aimedPart={aimedPart}
      arError={tracking.cameraError || arError}
      showDetectedOnly={showDetectedOnly}
      onToggleShowDetectedOnly={setShowDetectedOnly}
      onCreateIssue={handleCreateIssue}
      onBeginRepair={handleBeginRepair}
      onCompleteMaintenance={handleCompleteMaintenance}
      onApprovePart={handleApprovePart}
      canCreate={canCreate}
      onExit={onExit}
    />
  );
}
