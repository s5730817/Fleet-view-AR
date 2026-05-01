export function MenuView({ markers, onCapture, onTrack, onDeleteMarker, onExit }) {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-bold">AR Marker Workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Capture a physical marker and track it live. Marker data stays local in the browser for now.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCapture}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              Capture Marker
            </button>
            <button
              type="button"
              onClick={onTrack}
              disabled={markers.length === 0}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Track Markers
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold"
            >
              Back To Dashboard
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold">Saved Markers</h2>

          {markers.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No markers saved yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {markers.map((marker) => (
                <li key={marker.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{marker.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{marker.description || "No description"}</p>
                      <p className="text-xs text-muted-foreground mt-1">Barcode ID: {marker.barcodeValue}</p>
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
