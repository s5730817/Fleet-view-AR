import { MarkerCropModal } from "../components/MarkerCropModal";

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
  targetMarker,
  saveError,
  onSave,
  onBack,
  onExit,
  isEditing,
  setIsEditing,
  editor,
}) {
  const canSave = Number.isFinite(detectedBarcodeValue) && !barcodeMatchMarker;

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div ref={arContainerRef} className="fixed inset-0 z-[1000] h-screen w-screen overflow-hidden" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1002] bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md bg-black/60 px-3 py-2 text-sm font-semibold text-white"
          >
            Return
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-md bg-black/60 px-3 py-2 text-sm font-semibold text-white"
          >
            Back To Dashboard
          </button>

          <div className="ml-auto rounded-md bg-black/60 px-3 py-1.5 text-xs sm:text-sm">
            Capture Marker
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1001] h-[min(34vmin,280px)] w-[min(34vmin,280px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border-[3px] border-dashed border-white/95 shadow-[0_0_0_200vmax_rgba(0,0,0,0.15)]" />

      <div className="pointer-events-none absolute left-1/2 top-[calc(50%+min(17vmin,140px)+12px)] z-[1002] -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-xs sm:text-sm">
        {targetMarker ? `Target marker: ${targetMarker.id}` : "Center one marker in the box"}
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-[1002] mx-auto max-w-5xl rounded-xl border border-white/20 bg-black/60 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCapture}
            disabled={!videoReady || barcodeDetectionPending || !targetMarker}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Capture Marker
          </button>

          {!videoReady && !cameraError && <span className="text-xs text-white/80">Starting camera...</span>}
          {videoReady && !targetMarker && <span className="text-xs text-amber-300">No marker in target box</span>}
          {videoReady && targetMarker && <span className="text-xs text-emerald-300">Ready: marker {targetMarker.id}</span>}
        </div>

        {(cameraError || captureError || barcodeDetectionError) && (
          <div className="mt-2 space-y-1 text-xs text-red-300">
            {cameraError && <p>{cameraError}</p>}
            {captureError && <p>{captureError}</p>}
            {barcodeDetectionError && <p>{barcodeDetectionError}</p>}
          </div>
        )}
      </div>

      {markerPreviewUrl && (
        <div className="absolute inset-0 z-[1003] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xl">
            <h3 className="text-lg font-bold">Save Captured Marker</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Review capture and enter marker details.
            </p>

            <img
              src={markerPreviewUrl}
              alt="Captured marker"
              className="mt-3 h-48 w-full rounded-lg border object-cover"
            />

            {capturedQrData && (
              <p className="mt-2 text-xs text-muted-foreground">
                QR: <span className="font-semibold">{capturedQrData}</span>
              </p>
            )}

            {Number.isFinite(detectedBarcodeValue) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Barcode ID: <span className="font-semibold">{detectedBarcodeValue}</span>
              </p>
            )}

            {barcodeMatchMarker && (
              <p className="mt-2 text-xs text-amber-600">
                This barcode already exists as marker {barcodeMatchMarker.name}. Capture a different marker.
              </p>
            )}

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

            {saveError && <p className="mt-2 text-xs text-destructive">{saveError}</p>}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold"
              >
                Edit Crop
              </button>
              <button
                type="button"
                onClick={onBack}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!canSave}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Marker
              </button>
            </div>

            {isEditing && (
              <MarkerCropModal
                markerPreviewUrl={markerPreviewUrl}
                displayCorners={editor.displayCorners}
                previewDisplaySize={editor.previewDisplaySize}
                draggingCorner={editor.draggingCorner}
                setDraggingCorner={editor.setDraggingCorner}
                editError={editor.editError}
                modalPreviewImageRef={editor.modalPreviewImageRef}
                onLoad={editor.handlePreviewImageLoad}
                onPointerMove={editor.handlePointerMove}
                onPointerUp={editor.handlePointerUp}
                onApply={editor.applyCrop}
                onClose={() => setIsEditing(false)}
              />
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
