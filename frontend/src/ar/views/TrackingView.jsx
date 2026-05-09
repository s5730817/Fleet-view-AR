import { useEffect, useMemo, useState } from "react";
import { ARLegendPanel } from "../components/ARLegendPanel";
import { maintenanceLegendSections } from "../markerPresentation";

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
  onApprovePart,
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
  const [inspectionWorkflow, setInspectionWorkflow] = useState(null);
  const [isInspectionIssueOpen, setIsInspectionIssueOpen] = useState(false);
  const [inspectionIssueNote, setInspectionIssueNote] = useState("");
  const [isLegendOpen, setIsLegendOpen] = useState(false);

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
  const aimedTool = useMemo(
    () => (detectedMarkers || [])
      .filter((marker) => marker.assigned && marker.markerType === "tool" && marker.inAim)
      .sort((left, right) => left.distanceToCenter - right.distanceToCenter)[0] || null,
    [detectedMarkers],
  );
  const selectedPart = useMemo(
    () => parts.find((part) => part.id === selectedPartId) || aimedPart || detectedPartMarkers[0] || null,
    [parts, selectedPartId, aimedPart, detectedPartMarkers],
  );
  const isFixableIssue = (issue) => issue?.status !== "resolved" && issue?.status !== "awaiting_approval";
  const aimedPartFixableIssues = useMemo(
    () => (aimedPart?.activeIssues || []).filter(isFixableIssue),
    [aimedPart],
  );
  const selectedPartFixableIssues = useMemo(
    () => (selectedPart?.activeIssues || []).filter(isFixableIssue),
    [selectedPart],
  );
  const selectedIssueType = useMemo(
    () => selectedPart?.issueTypeOptions.find((option) => option.id === selectedIssueTypeId) || selectedPart?.issueTypeOptions[0] || null,
    [selectedIssueTypeId, selectedPart],
  );
  const selectedRepairIssue = useMemo(
    () => selectedPartFixableIssues.find((issue) => issue.id === selectedRepairIssueId) || selectedPartFixableIssues[0] || null,
    [selectedPartFixableIssues, selectedRepairIssueId],
  );
  const detectedToolNames = useMemo(
    () => detectedTools.map((tool) => tool.name),
    [detectedTools],
  );
  const issueAssignableUsers = useMemo(
    () => assignableUsers.filter((user) => user.role === "engineer"),
    [assignableUsers],
  );
  const workflowSteps = repairWorkflow?.guide?.steps || [];
  const currentWorkflowStep = workflowSteps[repairWorkflow?.currentStepIndex || 0] || null;
  const canApproveSelectedPart = Boolean(
    selectedPart
    && ["due_soon", "due_today", "overdue"].includes(selectedPart.maintenanceIndicator?.state)
  );
  const headerTrackingMessage = trackingMessage?.startsWith("No markers detected") ? "" : trackingMessage;
  const modalFieldClassName = "w-full rounded-md border border-white/15 bg-black/65 px-3 py-2 text-sm text-white placeholder:text-white/35";
  const modalTextAreaStyle = {
    backgroundColor: "rgba(5, 7, 11, 0.92)",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    caretColor: "#ffffff",
  };
  const modalSelectStyle = {
    colorScheme: "dark",
    backgroundColor: "rgba(5, 7, 11, 0.92)",
    color: "#ffffff",
  };
  const modalOptionStyle = {
    backgroundColor: "#05070b",
    color: "#ffffff",
  };
  const aimedLabel = aimedPart?.name || aimedTool?.name || null;

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
    : "No part";

  const choosePartLabel = aimedPart
    ? "Choose"
    : "No part";
  const managerActionLabel = aimedPart ? "Attach" : "No part";

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
      case "awaiting_return":
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
    setSelectedAssigneeId(issueAssignableUsers[0]?.id || "");
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
    setSelectedRepairIssueId(aimedPartFixableIssues[0]?.id || "");
    setEngineerActionMode(
      aimedPartFixableIssues.length > 0
        ? "fix"
        : ["due_soon", "due_today", "overdue"].includes(aimedPart.maintenanceIndicator?.state)
          ? "inspect"
          : "issue"
    );
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

  const handleStartInspection = () => {
    if (!selectedPart) {
      return;
    }

    setInspectionWorkflow({
      partId: selectedPart.id,
      partName: selectedPart.name,
      steps: selectedPart.issueTypeOptions || [],
      currentStepIndex: 0,
      foundIssueCount: 0,
      isComplete: false,
    });
    setIssueNote("");
    setIsEngineerActionOpen(false);
  };

  const handleInspectionOK = () => {
    if (!inspectionWorkflow) return;

    const nextIndex = inspectionWorkflow.currentStepIndex + 1;

    setInspectionWorkflow((w) => w ? {
      ...w,
      currentStepIndex: nextIndex,
      isComplete: nextIndex >= w.steps.length,
    } : w);
  };

  const handleInspectionIssueOpen = () => {
    setInspectionIssueNote("");
    setIsInspectionIssueOpen(true);
  };

  const handleInspectionIssueSubmit = async () => {
    const step = inspectionWorkflow?.steps?.[inspectionWorkflow.currentStepIndex];

    if (!step || !inspectionWorkflow) return;

    setIsSubmitting(true);

    try {
      await onCreateIssue({
        partId: inspectionWorkflow.partId,
        issueTypeId: step.id,
        assignedUserId: null,
        note: inspectionIssueNote.trim() || `Found during AR inspection: ${step.label}`,
      });

      const nextIndex = inspectionWorkflow.currentStepIndex + 1;

      setInspectionWorkflow((w) => w ? {
        ...w,
        currentStepIndex: nextIndex,
        foundIssueCount: w.foundIssueCount + 1,
        isComplete: nextIndex >= w.steps.length,
      } : w);
      setIsInspectionIssueOpen(false);
      setInspectionIssueNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteInspection = async () => {
    if (!inspectionWorkflow) return;

    setIsSigningOff(true);

    try {
      if (inspectionWorkflow.foundIssueCount === 0) {
        const part = parts.find((p) => p.id === inspectionWorkflow.partId);

        await onApprovePart({
          partId: inspectionWorkflow.partId,
          part,
          note: "AR inspection completed — no issues found.",
        });
      }

      setInspectionWorkflow(null);
    } finally {
      setIsSigningOff(false);
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

  const footerActionButton = isManagerView
    ? (
      <button
        type="button"
        onClick={() => openIssuePopup(aimedPart?.id)}
        disabled={!aimedPart}
        className="pointer-events-auto shrink-0 rounded-full bg-primary px-2 py-4 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {managerActionLabel}
      </button>
    )
    : isEngineerView && !repairWorkflow && !inspectionWorkflow
      ? (
        <button
          type="button"
          onClick={openEngineerActionPopup}
          disabled={!aimedPart}
          className="pointer-events-auto shrink-0 rounded-full bg-primary px-1 py-4 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {choosePartLabel}
        </button>
      )
      : null;

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div ref={arContainerRef} className="fixed inset-0 z-[1000] h-screen w-screen overflow-hidden bg-black" />

      {!repairWorkflow && !inspectionWorkflow && (
        <div
          className="pointer-events-none fixed left-1/2 top-1/2 z-[1001] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border-2 border-white/80"
          style={{
            width: "clamp(120px, 30vw, 220px)",
            height: "clamp(120px, 30vw, 220px)",
            boxShadow: "0 0 0 9999px rgba(7, 10, 15, 0.34)",
          }}
        >
          {aimedLabel && (
            <div className="absolute left-1/2 top-0 ar-glass-strong w-max max-w-[min(84vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 px-5 py-2.5 text-center text-lg font-semibold text-white shadow-lg backdrop-blur md:text-xl">
              <span className="block truncate">{aimedLabel}</span>
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[1002] p-4">
        <div className="pointer-events-auto ar-glass-strong mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 rounded-2xl border border-white/15 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={onExit}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
          >
            Exit AR
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{bus?.name || "Fleet AR"}</p>
          </div>

          {headerTrackingMessage && (
            <div className="min-w-0 flex-1 text-right text-xs text-white/80 sm:text-sm">
              <p className="truncate">{headerTrackingMessage}</p>
            </div>
          )}

          {!repairWorkflow && !inspectionWorkflow && (
            <div className="w-full rounded-xl border border-white/10 bg-black/65 px-3 py-2 text-xs text-white/85 md:hidden">
              {aimedPart
                ? `${aimedPart.name} in aim${aimedPartFixableIssues.length > 0 ? ` · ${aimedPartFixableIssues.length} active issue${aimedPartFixableIssues.length === 1 ? "" : "s"}` : canApproveSelectedPart ? ` · ${aimedPart.maintenanceIndicator.label}` : " · ready for action"}`
                : aimedTool
                  ? `${aimedTool.name} in aim`
                  : "Center a part or tool marker inside the aim helper."}
            </div>
          )}
        </div>
      </div>

      {!repairWorkflow && !inspectionWorkflow && (
        <div className="pointer-events-none fixed right-4 top-24 z-[1003] hidden ar-glass-strong w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-white/15 p-4 shadow-2xl backdrop-blur md:block">
          <div className="pointer-events-auto space-y-3">
            {aimedPart ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-100/80">In aim</p>
                    <p className="font-semibold">{aimedPart.name}</p>
                    <p className="text-xs text-white/70">Marker {aimedPart.markerCode} · {aimedPart.conditionLabel} · {aimedPart.lifecycleLabel}</p>
                  </div>
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-100">
                    In aim
                  </span>
                </div>
                <div className="mt-3 text-xs text-white/80">
                  {aimedPartFixableIssues.length > 0
                    ? `${aimedPartFixableIssues.length} active issue${aimedPartFixableIssues.length === 1 ? "" : "s"} available for guided repair.`
                    : canApproveSelectedPart
                      ? isEngineerView
                        ? `No active issues. ${aimedPart.maintenanceIndicator.label} — start an inspection from the action menu.`
                        : `No active issues. ${aimedPart.maintenanceIndicator.label} is due on this part.`
                      : isEngineerView
                        ? "No active issues yet. Start an inspection or log a new issue from the action menu."
                        : "No active issues yet. Use the report action to log one for this part."}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/65 p-4 text-sm text-white/80">
                Center a part marker inside the aim helper to continue.
              </div>
            )}

            {detectedTools.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-black/65 p-3 text-xs text-white/80">
                <p className="font-semibold text-white">Detected tools</p>
                <p className="mt-1">{detectedTools.map((tool) => tool.name).join(", ")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {repairWorkflow && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[1004] ar-glass-strong border-t border-white/15 p-4 pb-6 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-24 md:w-[min(360px,calc(100vw-2rem))] md:rounded-2xl md:border md:border-white/15"
          style={{ paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
        >
          <div className="pointer-events-auto mx-auto max-h-[min(48vh,420px)] w-full max-w-5xl space-y-3 overflow-y-auto text-sm text-white md:mx-0 md:max-h-none md:max-w-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Repair guide</p>
                <p className="font-semibold">{repairWorkflow.partName}</p>
                <p className="text-xs text-white/70">{repairWorkflow.issue.title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRepairWorkflow(null);
                  setCurrentStepChecked(false);
                }}
                className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/85"
              >
                Cancel
              </button>
            </div>

            {!repairWorkflow.toolsConfirmed ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/60 p-3">
                <p className="font-semibold text-white">Find required tools</p>
                <ul className="space-y-2 text-xs text-white/80">
                  {(repairWorkflow.guide.requiredToolTypes || []).map((toolName) => {
                    const found = (repairWorkflow.foundToolTypes || []).includes(toolName);

                    return (
                      <li key={toolName} className={`rounded-lg border px-3 py-2 ${found ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100 line-through" : "border-white/10 bg-black/45"}`}>
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
              <div className="space-y-3 rounded-xl border border-white/10 bg-black/60 p-3">
                <p className="font-semibold text-white">{repairWorkflow.guide.title}</p>
                {currentWorkflowStep ? (
                  <>
                    <p className="text-xs text-white/70">Step {repairWorkflow.currentStepIndex + 1} of {Math.max(workflowSteps.length, 1)}</p>
                    <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/45 p-3 text-xs text-white/90">
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

      {inspectionWorkflow && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[1004] ar-glass-strong border-t border-white/15 p-4 pb-6 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-24 md:w-[min(360px,calc(100vw-2rem))] md:rounded-2xl md:border md:border-white/15"
          style={{ paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
        >
          <div className="pointer-events-auto mx-auto max-h-[min(52vh,460px)] w-full max-w-5xl space-y-3 overflow-y-auto text-sm text-white md:mx-0 md:max-h-none md:max-w-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Inspection</p>
                <p className="font-semibold">{inspectionWorkflow.partName}</p>
                {!inspectionWorkflow.isComplete && (
                  <p className="text-xs text-white/70">Step {inspectionWorkflow.currentStepIndex + 1} of {inspectionWorkflow.steps.length}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setInspectionWorkflow(null)}
                className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/85"
              >
                Cancel
              </button>
            </div>

            {inspectionWorkflow.isComplete ? (
              <div className="rounded-xl border border-white/10 bg-black/60 p-3">
                <p className="font-semibold text-white">Inspection complete</p>
                <p className="mt-1 text-xs text-white/70">
                  {inspectionWorkflow.foundIssueCount === 0
                    ? "All checks passed — no issues found."
                    : `${inspectionWorkflow.foundIssueCount} issue${inspectionWorkflow.foundIssueCount === 1 ? "" : "s"} logged during inspection.`}
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCompleteInspection}
                    disabled={isSigningOff}
                    className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSigningOff ? "Saving..." : inspectionWorkflow.foundIssueCount === 0 ? "Mark as Good" : "Close Inspection"}
                  </button>
                </div>
              </div>
            ) : (() => {
              const step = inspectionWorkflow.steps[inspectionWorkflow.currentStepIndex];

              return step ? (
                <div className="rounded-xl border border-white/10 bg-black/60 p-3">
                  <p className="font-semibold text-white">{step.label}</p>
                  <p className="mt-1 text-xs text-white/70">{step.summary}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleInspectionOK}
                      className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={handleInspectionIssueOpen}
                      className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Issue Found
                    </button>
                  </div>
                </div>
              ) : null;
            })()}

            {inspectionWorkflow.foundIssueCount > 0 && !inspectionWorkflow.isComplete && (
              <p className="text-xs text-amber-200/80">
                {inspectionWorkflow.foundIssueCount} issue{inspectionWorkflow.foundIssueCount === 1 ? "" : "s"} logged so far
              </p>
            )}
          </div>
        </div>
      )}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[1004] p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-5xl justify-center">
          {!repairWorkflow && !inspectionWorkflow && footerActionButton && (
            <div className="flex max-w-full items-end gap-2">
              <ARLegendPanel
                title="Legend"
                sections={maintenanceLegendSections}
                isOpen={isLegendOpen}
                onToggle={() => setIsLegendOpen((current) => !current)}
                className="w-[min(6.5rem,26vw)] max-w-[6.5rem] min-w-0 shrink-0"
              />

              {footerActionButton}
            </div>
          )}
        </div>
      </div>

      {arError && (
        <div className="fixed inset-x-4 bottom-40 z-[1003] rounded-lg bg-black/88 px-3 py-2 text-xs text-red-300 md:inset-x-auto md:bottom-auto md:right-4 md:top-24">
          AR error: {arError}
        </div>
      )}

      {isIssueOpen && (
        <div className="fixed inset-0 z-[1005] overflow-y-auto bg-black/82 p-4">
          <div className="ar-glass-strong mx-auto mt-4 w-full max-w-md rounded-xl border border-white/15 p-4 text-white shadow-xl backdrop-blur sm:mt-10">
            <h3 className="text-lg font-bold">Add Issue To Bus Part</h3>
            <p className="mt-1 text-sm text-white/70">
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
                className={modalFieldClassName}
                style={modalSelectStyle}
              >
                {(detectedPartMarkers.length > 0 ? detectedPartMarkers : parts).map((part) => (
                  <option key={part.id} value={part.id} style={modalOptionStyle}>
                    {part.name} · marker {part.markerCode}
                  </option>
                ))}
              </select>

              <select
                value={selectedIssueType?.id || ""}
                onChange={(event) => setSelectedIssueTypeId(event.target.value)}
                className={modalFieldClassName}
                style={modalSelectStyle}
              >
                {(selectedPart?.issueTypeOptions || []).map((option) => (
                  <option key={option.id} value={option.id} style={modalOptionStyle}>
                    {option.label} · {option.recommendedAction}
                  </option>
                ))}
              </select>

              <select
                value={selectedAssigneeId}
                onChange={(event) => setSelectedAssigneeId(event.target.value)}
                className={modalFieldClassName}
                style={modalSelectStyle}
              >
                {issueAssignableUsers.map((user) => (
                  <option key={user.id} value={user.id} style={modalOptionStyle}>
                    {user.name} · {user.role}
                  </option>
                ))}
              </select>

              {issueAssignableUsers.length === 0 && (
                <p className="text-xs text-white/60">No depot engineers are available for assignment.</p>
              )}

              {selectedIssueType && (
                <div className="rounded-lg border border-white/10 bg-black/60 p-3 text-sm">
                  <p className="font-semibold text-white">{selectedIssueType.label}</p>
                  <p className="mt-1 text-white/70">{selectedIssueType.summary}</p>
                  <p className="mt-2 text-xs text-white/60">
                    Guide: {selectedIssueType.guide.title} · {selectedIssueType.guide.recommendedAction}
                  </p>
                </div>
              )}

              <textarea
                value={issueNote}
                onChange={(event) => setIssueNote(event.target.value)}
                placeholder="Initial note for mechanics (optional)"
                rows={3}
                className={modalFieldClassName}
                style={modalTextAreaStyle}
              />
            </div>

            <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-transparent pt-2">
              <button
                type="button"
                onClick={() => setIsIssueOpen(false)}
                className="rounded-md border border-white/15 bg-black/60 px-3 py-2 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssueSubmit}
                disabled={!selectedPart || !selectedIssueType || !selectedAssigneeId || isSubmitting}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Create Issue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEngineerActionOpen && (
        <div className="fixed inset-0 z-[1005] overflow-y-auto bg-black/82 p-4">
          <div className="ar-glass-strong mx-auto mt-4 w-full max-w-md rounded-xl border border-white/15 p-4 text-white shadow-xl backdrop-blur sm:mt-10">
            <h3 className="text-lg font-bold">Choose Action For {selectedPart?.name}</h3>
            <p className="mt-1 text-sm text-white/70">
              Log a new issue, start a guided repair/replacement, or run a step-by-step inspection for the part currently in the aim helper.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEngineerActionMode("issue")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${engineerActionMode === "issue" ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-black/60 text-white/85"}`}
              >
                Log Issue
              </button>
              <button
                type="button"
                onClick={() => setEngineerActionMode("fix")}
                disabled={!selectedPart || selectedPartFixableIssues.length === 0}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${engineerActionMode === "fix" ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-black/60 text-white/85"}`}
              >
                Fix
              </button>
              <button
                type="button"
                onClick={() => setEngineerActionMode("inspect")}
                disabled={!selectedPart}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${engineerActionMode === "inspect" ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-black/60 text-white/85"} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Inspect
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {engineerActionMode === "issue" ? (
                <>
                  <select
                    value={selectedIssueType?.id || ""}
                    onChange={(event) => setSelectedIssueTypeId(event.target.value)}
                    className={modalFieldClassName}
                    style={modalSelectStyle}
                  >
                    {(selectedPart?.issueTypeOptions || []).map((option) => (
                      <option key={option.id} value={option.id} style={modalOptionStyle}>
                        {option.label} · {option.recommendedAction}
                      </option>
                    ))}
                  </select>
                  {selectedIssueType && (
                    <div className="rounded-lg border border-white/10 bg-black/60 p-3 text-sm">
                      <p className="font-semibold text-white">{selectedIssueType.label}</p>
                      <p className="mt-1 text-white/70">{selectedIssueType.summary}</p>
                      <p className="mt-2 text-xs text-white/60">
                        Guide: {selectedIssueType.guide.title} · {selectedIssueType.guide.recommendedAction}
                      </p>
                    </div>
                  )}
                </>
              ) : engineerActionMode === "fix" ? (
                <>
                  {selectedPartFixableIssues.length > 0 ? (
                    <>
                      <select
                        value={selectedRepairIssue?.id || ""}
                        onChange={(event) => setSelectedRepairIssueId(event.target.value)}
                        className={modalFieldClassName}
                        style={modalSelectStyle}
                      >
                        {selectedPartFixableIssues.map((issue) => (
                          <option key={issue.id} value={issue.id} style={modalOptionStyle}>
                            {issue.title} · {issue.recommendedAction}
                          </option>
                        ))}
                      </select>

                      {selectedRepairIssue && (
                        <div className="rounded-lg border border-white/10 bg-black/60 p-3 text-sm">
                          <p className="font-semibold text-white">{selectedRepairIssue.title}</p>
                          <p className="mt-1 text-white/70">{selectedRepairIssue.description || selectedRepairIssue.issueTypeLabel}</p>
                          <p className="mt-2 text-xs text-white/60">
                            Guide: {selectedRepairIssue.guide.title}
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            Tools: {selectedRepairIssue.guide.requiredToolTypes.join(", ") || "No tracked tools required"}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-black/60 p-3 text-sm text-white/65">
                      There are no active issues on this part to repair yet. Log a new issue first.
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/60 p-3 text-sm">
                  <p className="font-semibold text-white">Start AR inspection for {selectedPart?.name}</p>
                  <p className="mt-1 text-white/70">
                    Each known issue type becomes a check step. Press OK to pass a step or Issue Found to log a problem.
                  </p>
                  {(selectedPart?.issueTypeOptions?.length ?? 0) > 0 && (
                    <p className="mt-2 text-xs text-white/60">
                      {selectedPart.issueTypeOptions.length} check{selectedPart.issueTypeOptions.length === 1 ? "" : "s"}: {selectedPart.issueTypeOptions.map((o) => o.label).join(" · ")}
                    </p>
                  )}
                </div>
              )}

              <textarea
                value={issueNote}
                onChange={(event) => setIssueNote(event.target.value)}
                placeholder="Add a pre-inspection note (optional)"
                rows={3}
                className={modalFieldClassName}
                style={modalTextAreaStyle}
              />
            </div>

            <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-transparent pt-2">
              <button
                type="button"
                onClick={() => setIsEngineerActionOpen(false)}
                className="rounded-md border border-white/15 bg-black/60 px-3 py-2 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={engineerActionMode === "issue" ? handleEngineerIssueSubmit : engineerActionMode === "fix" ? handleEngineerFixStart : handleStartInspection}
                disabled={engineerActionMode === "issue" ? (!selectedPart || !selectedIssueType || isSubmitting) : engineerActionMode === "fix" ? (!selectedPart || !selectedRepairIssue || isSubmitting) : (!selectedPart || isSubmitting)}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : engineerActionMode === "issue" ? "Create Issue" : engineerActionMode === "fix" ? "Load Fix Instructions" : "Start Inspection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isInspectionIssueOpen && inspectionWorkflow && (() => {
        const step = inspectionWorkflow.steps[inspectionWorkflow.currentStepIndex];

        return (
          <div className="fixed inset-0 z-[1006] overflow-y-auto bg-black/82 p-4">
            <div className="ar-glass-strong mx-auto mt-4 w-full max-w-md rounded-xl border border-white/15 p-4 text-white shadow-xl backdrop-blur sm:mt-10">
              <h3 className="text-lg font-bold">Log Issue: {step?.label}</h3>
              <p className="mt-1 text-sm text-white/70">{step?.summary}</p>

              <div className="mt-4">
                <textarea
                  value={inspectionIssueNote}
                  onChange={(event) => setInspectionIssueNote(event.target.value)}
                  placeholder="Describe what was found during this check (optional)"
                  rows={3}
                  className={modalFieldClassName}
                  style={modalTextAreaStyle}
                />
              </div>

              <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-transparent pt-2">
                <button
                  type="button"
                  onClick={() => setIsInspectionIssueOpen(false)}
                  className="rounded-md border border-white/15 bg-black/60 px-3 py-2 text-sm font-semibold text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInspectionIssueSubmit}
                  disabled={isSubmitting}
                  className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Log Issue & Continue"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
