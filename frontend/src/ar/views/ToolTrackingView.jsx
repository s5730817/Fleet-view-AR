import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, ListChecks, Wrench } from "lucide-react";

const getToolStatusClass = (status) => {
  switch (status) {
    case "in_use":
    case "awaiting_return":
      return "border-amber-300/40 bg-amber-500/10 text-amber-100";
    case "maintenance":
      return "border-red-300/40 bg-red-500/10 text-red-100";
    default:
      return "border-emerald-300/40 bg-emerald-500/10 text-emerald-100";
  }
};

export function ToolTrackingView({
  arContainerRef,
  bus,
  tools,
  trackingMessage,
  detectedMarkers,
  arError,
  onExit,
}) {
  const [isChecklistOpen, setIsChecklistOpen] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth >= 768 : true),
  );
  const [lockedMarkerIds, setLockedMarkerIds] = useState(() => new Set());
  const [isSignedOff, setIsSignedOff] = useState(false);
  const detectedMarkerIds = useMemo(
    () => new Set((detectedMarkers || []).map((marker) => marker.id)),
    [detectedMarkers],
  );

  useEffect(() => {
    if (detectedMarkerIds.size === 0) {
      return;
    }

    setLockedMarkerIds((current) => {
      const next = new Set(current);
      let changed = false;

      detectedMarkerIds.forEach((markerId) => {
        if (!next.has(markerId)) {
          next.add(markerId);
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [detectedMarkerIds]);

  const toolChecklist = useMemo(
    () => tools.map((tool) => ({
      ...tool,
      found: lockedMarkerIds.has(tool.markerCode),
    })),
    [tools, lockedMarkerIds],
  );

  const foundTools = toolChecklist.filter((tool) => tool.found);
  const remainingTools = toolChecklist.length - foundTools.length;
  const headerTrackingMessage = trackingMessage?.startsWith("No markers detected") ? "" : trackingMessage;
  const checklistButtonLabel = isChecklistOpen ? "Hide list" : `Checklist ${foundTools.length}/${toolChecklist.length || 0}`;
  const signOffButtonLabel = isSignedOff ? "Signed off" : "Sign off";
  const canSignOff = toolChecklist.length > 0 && remainingTools === 0;

  const checklistPanel = (
    <div className="space-y-3 text-white">
      <div className="rounded-2xl border border-white/10 ar-glass-strong p-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Tool checklist</p>
            <p className="mt-1 truncate text-sm font-semibold">{bus?.depotName || "Depot tools"}</p>
          </div>
          <div className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            {foundTools.length}/{toolChecklist.length || 0}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 ar-glass-strong p-3 backdrop-blur">
        {toolChecklist.length > 0 ? (
          <ul className="max-h-[min(46vh,26rem)] space-y-2 overflow-y-auto pr-1">
            {toolChecklist.map((tool) => (
              <li
                key={tool.id}
                className={`rounded-xl border px-3 py-2.5 transition ${tool.found ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-white"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20">
                    {tool.found ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-white/45" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${tool.found ? "line-through" : ""}`}>{tool.name}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getToolStatusClass(tool.status)}`}>
                        {String(tool.status).replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/70">
            No tracked tools are attached to this depot.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div ref={arContainerRef} className="fixed inset-0 z-[1000] h-screen w-screen overflow-hidden bg-black" />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[1002] p-4">
        <div className="pointer-events-auto mx-auto grid w-full max-w-6xl grid-cols-3 items-center gap-2 rounded-2xl border border-white/15 ar-glass-strong px-2 py-4 backdrop-blur sm:gap-3 sm:px-4 sm:py-3">
          <div className="min-w-0 flex justify-start">
            <button
              type="button"
              onClick={onExit}
              className="whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-2.5 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm"
            >
              Back
            </button>
          </div>

          <div className="min-w-0 flex justify-center px-1">
            <button
              type="button"
              onClick={() => setIsChecklistOpen((current) => !current)}
              className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-2.5 py-2 text-xs font-semibold text-white sm:gap-2 sm:px-4 sm:text-sm ${isChecklistOpen ? "md:hidden" : ""}`}
            >
              <ListChecks className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="truncate">{checklistButtonLabel}</span>
              {isChecklistOpen ? <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>
          </div>

          <div className="min-w-0 flex justify-end">
            <button
              type="button"
              onClick={() => setIsSignedOff(true)}
              disabled={!canSignOff || isSignedOff}
              className="whitespace-nowrap rounded-full border border-emerald-300/30 bg-emerald-500/15 px-2.5 py-2 text-xs font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              {signOffButtonLabel}
            </button>
          </div>
        </div>
      </div>

      {isChecklistOpen && (
        <>
          <div className="pointer-events-none fixed right-4 top-32 z-[1003] hidden w-[min(320px,calc(100vw-2rem))] md:block">
            <div className="pointer-events-auto">{checklistPanel}</div>
          </div>

          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[1004] p-4 md:hidden"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="pointer-events-auto mx-auto max-h-[34vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/15 ar-glass-strong p-3 shadow-2xl backdrop-blur">
              {checklistPanel}
            </div>
          </div>
        </>
      )}

      {arError && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[1005] flex justify-center px-4 md:bottom-6 md:px-6">
          <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-100 shadow-xl backdrop-blur">
            <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Camera tracking unavailable</p>
              <p className="mt-1 text-red-100/85">{arError}</p>
            </div>
          </div>
        </div>
      )}

      {isSignedOff && (
        <div className="pointer-events-none fixed inset-0 z-[1005] flex items-center justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-emerald-300/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-xl backdrop-blur">
            <p className="font-semibold">Tool check signed off</p>
            <p className="mt-1 text-emerald-100/85">All tracked tools were seen and the checklist is now locked for this session.</p>
          </div>
        </div>
      )}

  

    </div>
  );
}