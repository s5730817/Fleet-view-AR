import { useMemo, useState } from "react";

export function TrackingView({
  arContainerRef,
  bus,
  parts,
  assignableUsers,
  tools,
  role,
  trackingMessage,
  detectedMarkers,
  arError,
  onExit,
  showDetectedOnly,
  onToggleShowDetectedOnly,
  onCreateIssue,
  canCreate,
}) {
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [selectedIssueTypeId, setSelectedIssueTypeId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(assignableUsers[0]?.id || "");
  const [issueNote, setIssueNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManagerView = canCreate;
  const detectedMarkerIds = useMemo(
    () => new Set((detectedMarkers || []).map((marker) => marker.id)),
    [detectedMarkers],
  );
  const visibleTools = useMemo(
    () => (showDetectedOnly ? tools.filter((tool) => detectedMarkerIds.has(tool.markerCode)) : tools),
    [showDetectedOnly, tools, detectedMarkerIds],
  );
  const detectedPartMarkers = useMemo(
    () => parts.filter((part) => detectedMarkerIds.has(part.markerCode)),
    [parts, detectedMarkerIds],
  );
  const mechanicVisibleParts = useMemo(
    () => (showDetectedOnly ? detectedPartMarkers : parts),
    [showDetectedOnly, detectedPartMarkers, parts],
  );
  const selectedPart = useMemo(
    () => parts.find((part) => part.id === selectedPartId) || detectedPartMarkers[0] || null,
    [parts, selectedPartId, detectedPartMarkers],
  );
  const selectedIssueType = useMemo(
    () => selectedPart?.issueTypeOptions.find((option) => option.id === selectedIssueTypeId) || selectedPart?.issueTypeOptions[0] || null,
    [selectedIssueTypeId, selectedPart],
  );

  const reportButtonLabel = detectedPartMarkers.length > 0
    ? `Report issue on ${detectedPartMarkers[0].name}`
    : "Point camera at a part marker";

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "high":
        return "border-red-300/40 bg-red-500/10 text-red-100";
      case "low":
        return "border-emerald-300/40 bg-emerald-500/10 text-emerald-100";
      default:
        return "border-amber-300/40 bg-amber-500/10 text-amber-100";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "resolved":
        return "border-emerald-300/40 bg-emerald-500/10 text-emerald-100";
      case "in_progress":
        return "border-sky-300/40 bg-sky-500/10 text-sky-100";
      default:
        return "border-amber-300/40 bg-amber-500/10 text-amber-100";
    }
  };

  const getToolStatusClass = (status) => {
    switch (status) {
      case "in_use":
        return "border-amber-300/40 bg-amber-500/10 text-amber-100";
      case "maintenance":
        return "border-red-300/40 bg-red-500/10 text-red-100";
      default:
        return "border-emerald-300/40 bg-emerald-500/10 text-emerald-100";
    }
  };

  const openIssuePopup = (partId) => {
    const availableParts = detectedPartMarkers.length > 0 ? detectedPartMarkers : parts;
    const part = availableParts.find((entry) => entry.id === partId) || availableParts[0] || null;

    if (!part) {
      return;
    }

    setSelectedPartId(part.id);
    setSelectedIssueTypeId(part.issueTypeOptions[0]?.id || "");
    setSelectedAssigneeId(assignableUsers[0]?.id || "");
    setIssueNote("");
    setIsIssueOpen(true);
  };

  const handleIssueSubmit = async () => {
    if (!selectedPart || !selectedIssueType) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreateIssue({
        partId: selectedPart.id,
        issueTypeId: selectedIssueType.id,
        assignedUserId: selectedAssigneeId || null,
        note: issueNote.trim(),
      });

      setIsIssueOpen(false);
      setIssueNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div ref={arContainerRef} className="fixed inset-0 z-[1000] h-screen w-screen overflow-hidden bg-black" />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[1002] p-4">
        <div className="pointer-events-auto mx-auto flex w-full max-w-6xl items-center gap-3 rounded-2xl border border-white/15 bg-black/55 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={onExit}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
          >
            Exit AR
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{bus?.name || "Fleet AR"}</p>
            <p className="text-xs uppercase tracking-wide text-white/65">{role || (isManagerView ? "manager" : "mechanic")}</p>
          </div>

          <div className="ml-auto text-right text-xs sm:text-sm">
            <p className="font-semibold">Live Issue Tracker</p>
            <p className="text-white/80">{trackingMessage}</p>
          </div>

          {!isManagerView && (
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={showDetectedOnly}
                onChange={(event) => onToggleShowDetectedOnly(event.target.checked)}
              />
              Show detected only
            </label>
          )}
        </div>
      </div>

      {!isManagerView && (
        <div className="pointer-events-none fixed right-4 top-24 z-[1003] w-[min(420px,calc(100vw-2rem))] max-h-[calc(100vh-10rem)] overflow-auto rounded-2xl border border-white/15 bg-black/55 p-4 shadow-2xl backdrop-blur">
          <div className="pointer-events-auto space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">Detected Part Issues</p>
              <p className="text-xs text-white/70">
                Mechanics get repair or replacement guidance for the markers currently in view.
              </p>
            </div>

            {mechanicVisibleParts.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-black/35 p-4 text-sm text-white/75">
                No bus parts are visible with the current filter. Point the camera at a part marker or disable the detected-only filter.
              </div>
            )}

            {mechanicVisibleParts.map((part) => {
              const isDetected = detectedMarkerIds.has(part.markerCode);

              return (
                <div key={part.id} className={`rounded-xl p-4 text-sm text-white ${isDetected ? "border border-emerald-400/30 bg-emerald-500/10" : "border border-white/10 bg-black/35"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{part.name}</p>
                        {isDetected && (
                          <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-100">
                            In view
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/70">Marker {part.markerCode} · {part.status} · {part.healthPercent}% health</p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {part.activeIssues.length === 0 ? (
                      <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-white/70">
                        No active issues are linked to this part.
                      </div>
                    ) : (
                      part.activeIssues.slice(0, 3).map((issue) => {
                        const availableTools = issue.guide.requiredToolTypes.filter((toolType) =>
                          tools.some((tool) => tool.name === toolType),
                        );

                        return (
                          <div key={issue.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-white">{issue.title}</p>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${getPriorityClass(issue.priority)}`}>
                                {issue.priority}
                              </span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${getStatusClass(issue.status)}`}>
                                {issue.status.replaceAll("_", " ")}
                              </span>
                              <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sky-100">
                                {issue.recommendedAction}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-sky-100/90">Type: {issue.issueTypeLabel}</p>
                            {issue.assignedToName && (
                              <p className="mt-1 text-xs text-white/70">Assigned to: {issue.assignedToName}</p>
                            )}
                            {issue.description && <p className="mt-2 text-xs text-white/75">{issue.description}</p>}
                            {issue.latestComment && (
                              <p className="mt-2 text-xs text-sky-100/90">Latest note: {issue.latestComment}</p>
                            )}
                            <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{issue.guide.title}</p>
                              <ol className="mt-2 space-y-1 text-xs text-white/80">
                                {issue.guide.steps.slice(0, 4).map((step, index) => (
                                  <li key={`${issue.id}-step-${index}`}>{index + 1}. {step}</li>
                                ))}
                              </ol>
                              <p className="mt-3 text-[11px] text-white/65">
                                Required tools: {issue.guide.requiredToolTypes.join(", ") || "General inspection kit"}
                              </p>
                              <p className="text-[11px] text-emerald-100/80">
                                Available in depot: {availableTools.join(", ") || "No tracked depot tools matched"}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

            <div className="pt-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Depot Tools</p>
                <p className="text-xs text-white/65">Tracked regardless of selected bus</p>
              </div>
              <div className="space-y-2">
                {visibleTools.map((tool) => (
                  <div key={tool.id} className="rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{tool.name}</p>
                          {detectedMarkerIds.has(tool.markerCode) && (
                            <span className="rounded-full border border-sky-300/40 bg-sky-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sky-100">
                              In view
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/70">Marker {tool.markerCode} · {tool.depotName}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${getToolStatusClass(tool.status)}`}>
                        {tool.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[1004] p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {!isManagerView && (
            <div className="pointer-events-auto rounded-xl border border-white/20 bg-black/60 p-4 text-sm backdrop-blur sm:w-[min(460px,calc(100%-2rem))]">
              <p className="font-bold">Legend</p>
              <p className="mt-1">
                <span className="font-semibold text-emerald-300">Green</span>: bus part currently detected
              </p>
              <p>
                <span className="font-semibold text-sky-300">Blue</span>: depot tool currently detected
              </p>
            </div>
          )}

          {isManagerView && (
            <button
              type="button"
              onClick={() => openIssuePopup(detectedPartMarkers[0]?.id)}
              disabled={detectedPartMarkers.length === 0}
              className="pointer-events-auto ml-auto rounded-full bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {detectedPartMarkers.length > 0 ? "Report Issue" : reportButtonLabel}
            </button>
          )}
        </div>
      </div>

      {arError && (
        <div className="fixed right-4 top-24 z-[1003] rounded-lg bg-black/70 px-3 py-2 text-xs text-red-300">
          AR error: {arError}
        </div>
      )}

      {isIssueOpen && (
        <div className="fixed inset-0 z-[1005] overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto mt-4 w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xl sm:mt-10">
            <h3 className="text-lg font-bold">Add Issue To Bus Part</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Select the bus part and issue type. The mechanic overlay will use the linked guide automatically.
            </p>

            <div className="mt-4 space-y-3">
              <select
                value={selectedPart?.id || ""}
                onChange={(event) => {
                  const availableParts = detectedPartMarkers.length > 0 ? detectedPartMarkers : parts;
                  const nextPart = availableParts.find((part) => part.id === event.target.value) || null;
                  setSelectedPartId(nextPart?.id || null);
                  setSelectedIssueTypeId(nextPart?.issueTypeOptions[0]?.id || "");
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {(detectedPartMarkers.length > 0 ? detectedPartMarkers : parts).map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name} · marker {part.markerCode}
                  </option>
                ))}
              </select>

              <select
                value={selectedIssueType?.id || ""}
                onChange={(event) => setSelectedIssueTypeId(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {(selectedPart?.issueTypeOptions || []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.recommendedAction} · {option.priority}
                  </option>
                ))}
              </select>

              <select
                value={selectedAssigneeId}
                onChange={(event) => setSelectedAssigneeId(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.role}
                  </option>
                ))}
              </select>

              {selectedIssueType && (
                <div className="rounded-lg border border-border bg-background/60 p-3 text-sm">
                  <p className="font-semibold text-foreground">{selectedIssueType.label}</p>
                  <p className="mt-1 text-muted-foreground">{selectedIssueType.summary}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Guide: {selectedIssueType.guide.title} · {selectedIssueType.guide.recommendedAction}
                  </p>
                </div>
              )}

              <textarea
                value={issueNote}
                onChange={(event) => setIssueNote(event.target.value)}
                placeholder="Initial note for mechanics (optional)"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-card pt-2">
              <button
                type="button"
                onClick={() => setIsIssueOpen(false)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssueSubmit}
                disabled={!selectedPart || !selectedIssueType || isSubmitting}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Create Issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
