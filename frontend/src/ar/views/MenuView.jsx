export function MenuView({ markers, onCapture, onTrack, onDeleteMarker, onExit }) {
  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-xl border border-white/15 bg-black/75 p-5 shadow-xl backdrop-blur">
          <h1 className="text-2xl font-bold">AR Marker Workspace</h1>
          <p className="mt-2 text-sm text-white/70">
            Track physical markers live and assign names to detected IDs. Marker data stays local in the browser.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCapture}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              Capture New Marker
            </button>
            <button
              type="button"
              onClick={onTrack}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              Open AR Tracking
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
            >
              Back To Dashboard
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/15 bg-black/75 p-5 shadow-xl backdrop-blur">
          <h2 className="text-base font-bold">Saved Markers</h2>

          {markers.length === 0 ? (
            <p className="mt-2 text-sm text-white/70">No markers saved yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {markers.map((marker) => (
                <li key={marker.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{marker.name}</p>
                      <p className="mt-1 text-xs text-white/65">{marker.description || "No description"}</p>
                      <p className="mt-1 text-xs text-white/65">Barcode ID: {marker.barcodeValue}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteMarker(marker.id)}
                      className="rounded-md border border-destructive/50 px-2.5 py-1.5 text-xs font-semibold text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
