/**
 * Perspective-crop editor modal.
 *
 * Renders the captured marker image with four draggable corner handles and
 * an SVG polygon showing the crop quadrilateral the user has defined.
 * Apply/Cancel buttons are provided at the bottom.
 *
 * All drag state is managed by the parent via the editor hook; this component
 * is purely presentational.
 */
export function MarkerCropModal({
  markerPreviewUrl,
  displayCorners,
  previewDisplaySize,
  draggingCorner,
  setDraggingCorner,
  editError,
  modalPreviewImageRef,
  onLoad,
  onPointerMove,
  onPointerUp,
  onApply,
  onClose,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        // Prevent native scroll/zoom while the user drags corner handles.
        touchAction: "none",
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 640,
          maxHeight: "80vh",
          background: "#111",
          borderRadius: 16,
          padding: 16,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, color: "#fff" }}>Edit marker crop</h3>
          <button
            onClick={onClose}
            style={{
              color: "#fff",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        {/* ── Image + crop overlay ─────────────────────────────────────────── */}
        <div style={{ position: "relative", width: "100%", overflow: "hidden", background: "#000" }}>
          <img
            ref={modalPreviewImageRef}
            src={markerPreviewUrl}
            alt="Marker preview for cropping"
            onLoad={onLoad}
            draggable={false}
            style={{ width: "100%", display: "block", userSelect: "none" }}
          />

          {/* SVG polygon showing the current crop region */}
          {displayCorners.length === 4 && (
            <svg
              viewBox={`0 0 ${previewDisplaySize.width} ${previewDisplaySize.height}`}
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              <polygon
                points={displayCorners.map((c) => `${c.x},${c.y}`).join(" ")}
                fill="rgba(0,126,255,0.12)"
                stroke="#1e90ff"
                strokeWidth="2"
              />
            </svg>
          )}

          {/* Draggable corner handles */}
          {displayCorners.map((corner, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                left: corner.x,
                top: corner.y,
                width: 26,
                height: 26,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.95)",
                border: "2px solid #007eff",
                transform: "translate(-50%,-50%)",
                cursor: draggingCorner === index ? "grabbing" : "grab",
                zIndex: 2,
                touchAction: "none",
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                // Capture the pointer so drag continues even if the cursor
                // moves outside the handle element.
                e.currentTarget.setPointerCapture(e.pointerId);
                setDraggingCorner(index);
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                setDraggingCorner(null);
              }}
              onPointerCancel={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                setDraggingCorner(null);
              }}
            />
          ))}
        </div>

        {/* ── Action buttons ───────────────────────────────────────────────── */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: "#007eff",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Apply crop
          </button>
        </div>

        {editError && <p style={{ color: "#e74c3c", marginTop: 10 }}>{editError}</p>}
      </div>
    </div>
  );
}
