import { getMarkerToneColorToken } from "../markerPresentation";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function MarkerCircleOverlay({ markers }) {
  const visibleMarkers = (markers || []).filter((marker) => marker?.assigned && marker?.onScreen && Number.isFinite(marker?.screenRadius));

  if (visibleMarkers.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[1001] overflow-hidden">
      {visibleMarkers.map((marker) => {
        const { cssVar, fallback } = getMarkerToneColorToken(marker.tone);
        const accent = `hsl(var(${cssVar}, ${fallback}))`;
        const diameter = clamp(marker.screenRadius * 2, 24, 220);
        const strokeWidth = clamp(marker.screenRadius * 0.08, 2, 5);

        return (
          <div
            key={marker.id}
            className="absolute rounded-full"
            style={{
              left: `${marker.screenX}px`,
              top: `${marker.screenY}px`,
              width: `${diameter}px`,
              height: `${diameter}px`,
              transform: "translate(-50%, -50%)",
              border: `${strokeWidth}px solid ${accent}`,
              backgroundColor: "rgba(255,255,255,0.04)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 20px rgba(2,6,23,0.38)",
            }}
          />
        );
      })}
    </div>
  );
}