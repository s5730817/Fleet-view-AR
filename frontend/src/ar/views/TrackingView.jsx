import { useMemo, useState } from "react";

export function TrackingView({
  arContainerRef,
  trackingMessage,
  detectedMarkers,
  arError,
  onBack,
  onExit,
  showCapturedOnly,
  onToggleShowCapturedOnly,
  onAssignMarker,
}) {
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [markerName, setMarkerName] = useState("");
  const [markerDescription, setMarkerDescription] = useState("");

  const assignableMarkers = useMemo(
    () => (detectedMarkers || []).filter((marker) => !marker.assigned),
    [detectedMarkers],
  );

  const selectedMarkerId = assignableMarkers[0]?.id ?? null;

  const openAssignPopup = () => {
    setMarkerName("");
    setMarkerDescription("");
    setIsAssignOpen(true);
  };

  const handleSubmit = () => {
    if (!Number.isFinite(selectedMarkerId)) {
      return;
    }

    onAssignMarker({
      barcodeValue: selectedMarkerId,
      name: markerName,
      description: markerDescription,
    });

    setIsAssignOpen(false);
    setMarkerName("");
    setMarkerDescription("");
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div ref={arContainerRef} className="fixed inset-0 z-[1000] h-screen w-screen overflow-hidden" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1002] bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-black/55 p-3 backdrop-blur">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            Return
          </button>

          <button
            type="button"
            onClick={onExit}
            className="rounded-md border border-white/30 bg-black/40 px-3 py-2 text-sm font-semibold text-white"
          >
            Back To Dashboard
          </button>

          <button
            type="button"
            onClick={openAssignPopup}
            disabled={!selectedMarkerId}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Capture Marker
          </button>

          <div className="ml-auto text-xs sm:text-sm">
            <p className="font-semibold">Matrix Marker Scanner</p>
            <p className="text-white/80">{trackingMessage}</p>
          </div>

          <label className="ml-auto inline-flex items-center gap-2 text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={showCapturedOnly}
              onChange={(event) => onToggleShowCapturedOnly(event.target.checked)}
            />
            Show captured only
          </label>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[1002] w-[min(460px,calc(100%-2rem))] rounded-xl border border-white/20 bg-black/60 p-4 text-sm backdrop-blur">
        <p className="font-bold">Legend</p>
        <p className="mt-1">
          <span className="font-semibold text-emerald-300">Green</span>: assigned marker
        </p>
        <p>
          <span className="font-semibold text-rose-300">Red</span>: unassigned marker
        </p>
      </div>

      {arError && (
        <div className="absolute bottom-4 right-4 z-[1002] rounded-lg bg-black/70 px-3 py-2 text-xs text-red-300">
          AR error: {arError}
        </div>
      )}

      {isAssignOpen && (
        <div className="absolute inset-0 z-[1003] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xl">
            <h3 className="text-lg font-bold">Assign Marker</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedMarkerId ? `Detected marker ID ${selectedMarkerId}` : "No marker detected."}
            </p>

            <div className="mt-3 space-y-2">
              <input
                value={markerName}
                onChange={(event) => setMarkerName(event.target.value)}
                placeholder="Marker name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                value={markerDescription}
                onChange={(event) => setMarkerDescription(event.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedMarkerId}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Marker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
