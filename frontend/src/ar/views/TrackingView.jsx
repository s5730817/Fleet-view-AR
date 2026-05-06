import { useEffect, useMemo, useState } from "react";

export function TrackingView({
  arContainerRef,
  bus,
  parts,
  assignableUsers,
  tools,
  role,
  trackingMessage,
  detectedMarkers,
  aimedPart,
  arError,
  onExit,
  showDetectedOnly,
  onToggleShowDetectedOnly,
  onCreateIssue,
  onBeginRepair,
  onCompleteMaintenance,
  canCreate,
}) {
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isEngineerActionOpen, setIsEngineerActionOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [selectedIssueTypeId, setSelectedIssueTypeId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [selectedRepairIssueId, setSelectedRepairIssueId] = useState("");
  const [engineerActionMode, setEngineerActionMode] = useState("issue");
  const [issueNote, setIssueNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repairWorkflow, setRepairWorkflow] = useState(null);
  const [currentStepChecked, setCurrentStepChecked] = useState(false);
  const [isSigningOff, setIsSigningOff] = useState(false);

  const isManagerView = canCreate;
  const isEngineerView = !isManagerView;
  const detectedMarkerIds = useMemo(
    () => new Set((detectedMarkers || []).map((marker) => marker.id)),
    [detectedMarkers],
  );
  const detectedTools = useMemo(
    () => tools.filter((tool) => detectedMarkerIds.has(tool.markerCode)),
    [tools, detectedMarkerIds],
  );
  const detectedPartMarkers = useMemo(
    () => parts.filter((part) => detectedMarkerIds.has(part.markerCode)),
    [parts, detectedMarkerIds],
  );
  const selectedPart = useMemo(
    () => parts.find((part) => part.id === selectedPartId) || aimedPart || detectedPartMarkers[0] || null,
    [parts, selectedPartId, aimedPart, detectedPartMarkers],
  );
  const selectedIssueType = useMemo(
    () => selectedPart?.issueTypeOptions.find((option) => option.id === selectedIssueTypeId) || selectedPart?.issueTypeOptions[0] || null,
    [selectedIssueTypeId, selectedPart],
  );
  const selectedRepairIssue = useMemo(
    () => selectedPart?.activeIssues.find((issue) => issue.id === selectedRepairIssueId) || selectedPart?.activeIssues[0] || null,
    [selectedPart, selectedRepairIssueId],
  );
  const detectedToolNames = useMemo(
    () => detectedTools.map((tool) => tool.name),
    [detectedTools],
  );
  const workflowSteps = repairWorkflow?.guide?.steps || [];
  const currentWorkflowStep = workflowSteps[repairWorkflow?.currentStepIndex || 0] || null;

  useEffect(() => {
    if (!repairWorkflow) {
      return;
    }

    const requiredTools = repairWorkflow.guide?.requiredToolTypes || [];

    if (requiredTools.length === 0) {
      if (!repairWorkflow.toolsConfirmed) {
        setRepairWorkflow((currentWorkflow) => currentWorkflow ? { ...currentWorkflow, toolsConfirmed: true } : currentWorkflow);
      }
      return;
    }

    const nextFoundToolTypes = requiredTools.filter((toolName) => detectedToolNames.includes(toolName));

    if (nextFoundToolTypes.length === 0) {
      return;
    }

    setRepairWorkflow((currentWorkflow) => {
      if (!currentWorkflow) {
        return currentWorkflow;
      }

      const foundToolTypes = [...new Set([...(currentWorkflow.foundToolTypes || []), ...nextFoundToolTypes])];
      const toolsConfirmed = requiredTools.every((toolName) => foundToolTypes.includes(toolName));

      if (
        toolsConfirmed === currentWorkflow.toolsConfirmed
        && foundToolTypes.length === (currentWorkflow.foundToolTypes || []).length
      ) {
        return currentWorkflow;
      }

      return {
        ...currentWorkflow,
        foundToolTypes,
        toolsConfirmed,
      };
    });
  }, [detectedToolNames, repairWorkflow]);

  const reportButtonLabel = detectedPartMarkers.length > 0
    ? `Report issue on ${detectedPartMarkers[0].name}`
    : "Point camera at a part marker";

  const choosePartLabel = aimedPart
    ? `Choose ${aimedPart.name}`
    : "Point the aim helper at a part marker";

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

  const openEngineerActionPopup = () => {
    if (!aimedPart) {
      return;
    }

    setSelectedPartId(aimedPart.id);
    setSelectedIssueTypeId(aimedPart.issueTypeOptions[0]?.id || "");
    setSelectedAssigneeId("");
    setSelectedRepairIssueId(aimedPart.activeIssues[0]?.id || "");
    setEngineerActionMode(aimedPart.activeIssues.length > 0 ? "fix" : "issue");
    setIssueNote("");
    setIsEngineerActionOpen(true);
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

  const handleEngineerIssueSubmit = async () => {
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

      setIsEngineerActionOpen(false);
      setIssueNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEngineerFixStart = async () => {
    if (!selectedPart || !selectedRepairIssue) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onBeginRepair({
        partId: selectedPart.id,
        issueId: selectedRepairIssue.id,
      });

      setRepairWorkflow({
        partId: selectedPart.id,
        partName: selectedPart.name,
        issue: selectedRepairIssue,
        guide: selectedRepairIssue.guide,
        currentStepIndex: 0,
        foundToolTypes: [],
        toolsConfirmed: false,
      });
      setCurrentStepChecked(false);
      setIsEngineerActionOpen(false);
      setIssueNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    setRepairWorkflow((currentWorkflow) => {
      if (!currentWorkflow) {
        return currentWorkflow;
      }

      return {
        ...currentWorkflow,
        currentStepIndex: currentWorkflow.currentStepIndex + 1,
      };
    });
    setCurrentStepChecked(false);
  };

  const handleSignOff = async () => {
    if (!repairWorkflow) {
      return;
    }

    setIsSigningOff(true);

    try {
      await onCompleteMaintenance({
        partId: repairWorkflow.partId,
        issue: repairWorkflow.issue,
      });

      setRepairWorkflow(null);
      setCurrentStepChecked(false);
    } finally {
      setIsSigningOff(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div ref={arContainerRef} className="fixed inset-0 z-[1000] h-screen w-screen overflow-hidden bg-black" />

      {isEngineerView && (
        <div
          className="pointer-events-none fixed left-1/2 top-1/2 z-[1001] h-[min(36vw,220px)] w-[min(36vw,220px)] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border-2 border-white/80"
          style={{ boxShadow: "0 0 0 9999px rgba(7, 10, 15, 0.34)" }}
        >
          <div className="absolute inset-4 rounded-[18px] border border-white/20" />
        </div>
      )}

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
        </div>
      </div>

      {isEngineerView && !repairWorkflow && (
        <div className="pointer-events-none fixed right-4 top-24 z-[1003] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-black/55 p-4 shadow-2xl backdrop-blur">
          <div className="pointer-events-auto space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">AR Engineer Workflow</p>
              <p className="text-xs text-white/70">
                Aim the helper at a part marker, then choose that part to log an issue or start a guided fix.
              </p>
            </div>

            {aimedPart ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{aimedPart.name}</p>
                    <p className="text-xs text-white/70">Marker {aimedPart.markerCode} · {aimedPart.conditionLabel} · {aimedPart.lifecycleLabel}</p>
                  </div>
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-100">
                    In aim
                  </span>
                </div>
                <div className="mt-3 text-xs text-white/80">
                  {aimedPart.activeIssues.length > 0
                    ? `${aimedPart.activeIssues.length} active issue${aimedPart.activeIssues.length === 1 ? "" : "s"} available for guided repair.`
                    : "No active issues yet. Log a new issue from the action menu."}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/35 p-4 text-sm text-white/75">
                No part is currently centered in the aim helper.
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-xs text-white/75">
              <p className="font-semibold text-white">Detected tools</p>
              <p className="mt-1">{detectedTools.length > 0 ? detectedTools.map((tool) => tool.name).join(", ") : "No tool markers detected yet."}</p>
            </div>
          </div>
        </div>
      )}

      {repairWorkflow && (
        <div className="pointer-events-none fixed right-4 top-24 z-[1003] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-black/60 p-4 shadow-2xl backdrop-blur">
          <div className="pointer-events-auto space-y-3 text-sm text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{repairWorkflow.partName}</p>
                <p className="text-xs text-white/70">{repairWorkflow.issue.title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRepairWorkflow(null);
                  setCurrentStepChecked(false);
                }}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80"
              >
                Cancel
              </button>
            </div>

            {!repairWorkflow.toolsConfirmed ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/35 p-3">
                <p className="font-semibold text-white">Find required tools</p>
                <ul className="space-y-2 text-xs text-white/80">
                  {(repairWorkflow.guide.requiredToolTypes || []).map((toolName) => {
                    const found = (repairWorkflow.foundToolTypes || []).includes(toolName);

                    return (
                      <li key={toolName} className={`rounded-lg border px-3 py-2 ${found ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100 line-through" : "border-white/10 bg-black/20"}`}>
                        {toolName}
                      </li>
                    );
                  })}
                </ul>
                {repairWorkflow.guide.requiredToolTypes.length === 0 && (
                  <p className="text-xs text-white/70">No tracked tools are required for this guide.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-white/10 bg-black/35 p-3">
                <p className="font-semibold text-white">{repairWorkflow.guide.title}</p>
                {currentWorkflowStep ? (
                  <>
                    <p className="text-xs text-white/70">Step {repairWorkflow.currentStepIndex + 1} of {Math.max(workflowSteps.length, 1)}</p>
                    <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-white/85">
                      <input
                        type="checkbox"
                        checked={currentStepChecked}
                        onChange={(event) => setCurrentStepChecked(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>{currentWorkflowStep}</span>
                    </label>
                  </>
                ) : (
                  <p className="text-xs text-white/80">All repair steps are complete. Sign off to update the part status.</p>
                )}

                <div className="flex justify-end gap-2">
                  {currentWorkflowStep && currentStepChecked && repairWorkflow.currentStepIndex < workflowSteps.length - 1 && (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      Next
                    </button>
                  )}

                  {(!currentWorkflowStep || (currentStepChecked && repairWorkflow.currentStepIndex === workflowSteps.length - 1)) && (
                    <button
                      type="button"
                      onClick={handleSignOff}
                      disabled={isSigningOff}
                      className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSigningOff ? "Signing off..." : "Sign-off"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[1004] p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {isEngineerView && (
            <div className="pointer-events-auto rounded-xl border border-white/20 bg-black/60 p-4 text-sm backdrop-blur sm:w-[min(460px,calc(100%-2rem))]">
              <p className="font-bold">Engineer AR Mode</p>
              <p className="mt-1 text-white/80">Use the transparent center square to target a part marker, then open the action menu.</p>
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

          {isEngineerView && (
            <button
              type="button"
              onClick={openEngineerActionPopup}
              disabled={!aimedPart}
              className="pointer-events-auto ml-auto rounded-full bg-primary px-6 py-4 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aimedPart ? "Choose This Part" : choosePartLabel}
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

      {isEngineerActionOpen && (
        <div className="fixed inset-0 z-[1005] overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto mt-4 w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xl sm:mt-10">
            <h3 className="text-lg font-bold">Choose Action For {selectedPart?.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Log a new issue or start a guided repair/replacement for the part currently in the aim helper.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEngineerActionMode("issue")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${engineerActionMode === "issue" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}
              >
                Log Issue
              </button>
              <button
                type="button"
                onClick={() => setEngineerActionMode("fix")}
                disabled={!selectedPart || selectedPart.activeIssues.length === 0}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Fix
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {engineerActionMode === "issue" ? (
                <>
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
                </>
              ) : (
                <>
                  {selectedPart?.activeIssues.length > 0 ? (
                    <>
                      <select
                        value={selectedRepairIssue?.id || ""}
                        onChange={(event) => setSelectedRepairIssueId(event.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {selectedPart.activeIssues.map((issue) => (
                          <option key={issue.id} value={issue.id}>
                            {issue.title} · {issue.recommendedAction} · {issue.status}
                          </option>
                        ))}
                      </select>

                      {selectedRepairIssue && (
                        <div className="rounded-lg border border-border bg-background/60 p-3 text-sm">
                          <p className="font-semibold text-foreground">{selectedRepairIssue.title}</p>
                          <p className="mt-1 text-muted-foreground">{selectedRepairIssue.description || selectedRepairIssue.issueTypeLabel}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Guide: {selectedRepairIssue.guide.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Tools: {selectedRepairIssue.guide.requiredToolTypes.join(", ") || "No tracked tools required"}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                      There are no active issues on this part to repair yet. Log a new issue first.
                    </div>
                  )}
                </>
              )}

              <textarea
                value={issueNote}
                onChange={(event) => setIssueNote(event.target.value)}
                placeholder="Add an initial note (optional)"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-card pt-2">
              <button
                type="button"
                onClick={() => setIsEngineerActionOpen(false)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={engineerActionMode === "issue" ? handleEngineerIssueSubmit : handleEngineerFixStart}
                disabled={engineerActionMode === "issue" ? (!selectedPart || !selectedIssueType || isSubmitting) : (!selectedPart || !selectedRepairIssue || isSubmitting)}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : engineerActionMode === "issue" ? "Create Issue" : "Load Fix Instructions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
