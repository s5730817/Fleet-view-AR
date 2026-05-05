export function CaptureView({
  arContainerRef,
  videoReady,
  cameraError,
  canvasRef,
  captureError,
  markerPreviewUrl,
  capturedQrData,
  onCapture,
  markerName,
  setMarkerName,
  markerDescription,
  setMarkerDescription,
  detectedBarcodeValue,
  barcodeMatchMarker,
  barcodeDetectionPending,
  barcodeDetectionError,
  barcodeDebugInfo,
  lastDecodeSource,
  targetMarker,
  saveError,
  onSave,
  onBack,
  onExit,
}) {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <div ref={arContainerRef} className="fixed inset-0 z-[1000] h-screen w-screen overflow-hidden bg-black" />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[1002] bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-black/55 p-3 backdrop-blur">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            Return
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="rounded-md border border-white/30 bg-black/40 px-3 py-2 text-sm font-semibold text-white"
            >
              Back To Dashboard
            </button>
          )}

          <div className="ml-auto text-xs sm:text-sm">
            <p className="font-semibold">Capture Marker</p>
            <p className="text-white/80">Point the camera at a marker, then capture a frame.</p>
          </div>

          <div className="ml-auto rounded-full bg-black/40 px-3 py-1 text-xs text-white/90 sm:text-sm">
            {targetMarker ? `Target marker: ${targetMarker.id}` : "Center one marker in the box"}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1001] h-[min(34vmin,280px)] w-[min(34vmin,280px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border-[3px] border-dashed border-white/95 shadow-[0_0_0_200vmax_rgba(0,0,0,0.15)]" />

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[1004] p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="pointer-events-auto rounded-xl border border-white/20 bg-black/60 p-4 text-sm backdrop-blur sm:w-[min(460px,calc(100%-2rem))]">
            <p className="font-bold">Capture Status</p>
            {!videoReady && !cameraError && <p className="mt-1 text-white/80">Starting camera...</p>}
            {videoReady && !targetMarker && <p className="mt-1 font-semibold text-amber-300">No marker in target box</p>}
            {videoReady && targetMarker && <p className="mt-1 font-semibold text-emerald-300">Ready: marker {targetMarker.id}</p>}
            {capturedQrData && (
              <p className="mt-1 text-white/80">
                QR data detected: <span className="font-semibold text-emerald-300">{capturedQrData}</span>
              </p>
            )}
            {Number.isFinite(detectedBarcodeValue) && (
              <p className="mt-1 text-white/80">
                Detected AR barcode ID: <span className="font-semibold text-emerald-300">{detectedBarcodeValue}</span>
              </p>
            )}
            {barcodeMatchMarker && (
              <p className="mt-1 font-semibold text-amber-300">
                Existing marker found: {barcodeMatchMarker.name}
              </p>
            )}
            {barcodeDetectionPending && <p className="mt-1 text-white/80">Detecting barcode...</p>}
          </div>

          <button
            type="button"
            onClick={onCapture}
            disabled={!videoReady || barcodeDetectionPending || !targetMarker}
            className="pointer-events-auto w-full rounded-full border border-white/35 bg-black/70 px-5 py-3 text-sm font-semibold text-white backdrop-blur disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Capture Marker
          </button>
        </div>
      </div>

      {(cameraError || captureError || barcodeDetectionError) && (
        <div className="fixed right-4 top-24 z-[1003] space-y-2">
          {cameraError && <div className="rounded-lg bg-black/70 px-3 py-2 text-xs text-red-300">Camera error: {cameraError}</div>}
          {captureError && <div className="rounded-lg bg-black/70 px-3 py-2 text-xs text-red-300">Capture error: {captureError}</div>}
          {barcodeDetectionError && (
            <div className="rounded-lg bg-black/70 px-3 py-2 text-xs text-red-300">Barcode error: {barcodeDetectionError}</div>
          )}
        </div>
      )}

      {barcodeDebugInfo?.length > 0 && (
        <div className="fixed bottom-28 right-4 z-[1003] w-[min(460px,calc(100vw-2rem))] max-h-[40vh] overflow-auto rounded-xl border border-white/20 bg-black/75 p-4 text-xs text-white backdrop-blur">
          <p className="font-bold">Barcode decode debug ({lastDecodeSource || "unknown"})</p>
          <div className="mt-3 grid gap-3">
            {barcodeDebugInfo.map((entry) => (
              <div key={entry.candidate} className="leading-5 text-white/90">
                <strong>{entry.candidate}</strong>: markers={entry.markerCount}, detected=
                {Number.isFinite(entry.detected) ? ` ${entry.detected}` : " none"}
                <br />
                raw={
                  entry.markers?.length
                    ? entry.markers
                        .map((m) => `[#${m.index} id=${m.id} patt=${m.idPatt} matrix=${m.idMatrix} pick=${m.selected}]`)
                        .join(" ")
                    : " none"
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {markerPreviewUrl && (
        <div className="fixed inset-0 z-[1005] overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto mt-4 w-full max-w-2xl rounded-xl border border-border bg-card p-4 text-foreground shadow-xl sm:mt-10">
            <h3 className="text-lg font-bold">Captured Frame</h3>

            <img src={markerPreviewUrl} alt="Captured marker" className="mt-3 w-full rounded-xl border border-border object-cover" />

            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              {capturedQrData && (
                <p>
                  QR data detected: <span className="font-semibold text-foreground">{capturedQrData}</span>
                </p>
              )}
              {Number.isFinite(detectedBarcodeValue) && (
                <p>
                  Detected AR barcode ID: <span className="font-semibold text-foreground">{detectedBarcodeValue}</span>
                </p>
              )}
              {barcodeMatchMarker && (
                <p className="font-semibold text-amber-600">
                  This barcode already exists as marker {barcodeMatchMarker.name}. Capture a different marker.
                </p>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <input
                value={markerName}
                onChange={(e) => setMarkerName(e.target.value)}
                placeholder="Marker name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                value={markerDescription}
                onChange={(e) => setMarkerDescription(e.target.value)}
                placeholder="Marker description"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {saveError && <p className="mt-3 text-sm text-red-500">{saveError}</p>}

            <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-card pt-2">
              <button
                type="button"
                onClick={onCapture}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold"
              >
                Capture Again
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!Number.isFinite(detectedBarcodeValue) || Boolean(barcodeMatchMarker)}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Marker
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
