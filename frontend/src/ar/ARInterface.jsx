import { useMemo, useState } from "react";
import { usePermission } from "@/context/PermissionContext";
import { useToast } from "@/hooks/use-toast";
import { addFaultUpdate, createFault } from "@/lib/api";
import { APP_STATES } from "./constants";
import { useAREngine } from "./hooks/useAREngine";
import { useARTracking } from "./hooks/useARTracking";
import { TrackingView } from "./views/TrackingView";

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
export default function ARInterface({ arContext, onExit, onIssueCreated }) {
  const [showDetectedOnly, setShowDetectedOnly] = useState(false);

  const { hasPermission, role } = usePermission();
  const { toast } = useToast();
  const { arReady, arError } = useAREngine();
  const markers = useMemo(
    () => [
      ...arContext.parts.map((part) => ({
        barcodeValue: part.markerCode,
        name: part.name,
        description: `${part.status} · ${part.healthPercent}% health`,
        issuePoints: part.activeIssues,
        markerType: "part",
      })),
      ...arContext.tools.map((tool) => ({
        barcodeValue: tool.markerCode,
        name: tool.name,
        description: `${tool.depotName} · ${tool.status}`,
        issuePoints: [],
        markerType: "tool",
      })),
    ],
    [arContext.parts, arContext.tools],
  );
  const tracking = useARTracking({
    appState: APP_STATES.TRACKING,
    arReady,
    markers,
    showCapturedOnly: showDetectedOnly,
  });
  const canCreate = hasPermission("create");

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

      const storedUser = getStoredUser();

      const createdIssue = await createFault({
        title: `${part.name}: ${issueType.label}`,
        description: `${issueType.summary}\n\nBus: ${arContext.bus.name} (${arContext.bus.plateNumber})\nPart marker: ${part.markerCode}`,
        priority: issueType.priority,
        bus_part_id: part.id,
        issue_type_id: issueType.id,
        created_by: storedUser.id || undefined,
        assigned_user_id: assignedUserId || undefined,
        source: "ar_scan",
      });

      if (note?.trim()) {
        await addFaultUpdate(createdIssue.id, {
          created_by: storedUser.id || null,
          update_type: "comment",
          description: note.trim(),
        });
      }

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
      arError={arError}
      showDetectedOnly={showDetectedOnly}
      onToggleShowDetectedOnly={setShowDetectedOnly}
      onCreateIssue={handleCreateIssue}
      canCreate={canCreate}
      onExit={onExit}
    />
  );
}
