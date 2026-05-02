import { useState } from "react";
import { createMarker } from "./markerStorage";
import { APP_STATES } from "./constants";
import { useMarkers } from "./hooks/useMarkers";
import { useAREngine } from "./hooks/useAREngine";
import { useARTracking } from "./hooks/useARTracking";
import { MenuView } from "./views/MenuView";
import { TrackingView } from "./views/TrackingView";

/**
 * Root application component — thin orchestrator.
 *
 * Composes all domain hooks and routes to the correct view based on
 * appState.  No business logic lives here other than the navigation
 * callbacks that wire the hooks together.
 *
 * State owned here:
 *   appState          - which screen is visible
 *   showCapturedOnly  - tracking filter toggle
 */
export default function ARInterface({ onExit }) {
  // ─── Navigation state ────────────────────────────────────────────────────────
  const [appState, setAppState] = useState(APP_STATES.MENU);

  const [showCapturedOnly, setShowCapturedOnly] = useState(false);

  // ─── Domain hooks ────────────────────────────────────────────────────────────
  const { markers, saveMarkerList } = useMarkers();
  const { arReady, arError } = useAREngine();
  const tracking = useARTracking({ appState, arReady, markers, showCapturedOnly });

  // ─── Navigation callbacks ────────────────────────────────────────────────────

  /** Remove a saved marker and persist the change. */
  const handleDeleteMarker = (markerId) => {
    const marker = markers.find((m) => m.id === markerId);
    if (!marker) return;

    const confirmed = window.confirm(`Delete marker "${marker.name}" (barcode ${marker.barcodeValue})?`);
    if (!confirmed) return;

    const updatedMarkers = markers.filter((m) => m.id !== markerId);
    saveMarkerList(updatedMarkers);
  };

  const handleAssignDetectedMarker = ({ barcodeValue, name, description }) => {
    if (!Number.isFinite(barcodeValue)) {
      return;
    }

    const alreadyExists = markers.some((marker) => marker.barcodeValue === barcodeValue);
    if (alreadyExists) {
      return;
    }

    const newMarker = createMarker({
      name,
      description,
      imageUrl: "",
      barcodeValue,
    });

    saveMarkerList([newMarker, ...markers]);
  };

  /** Return to the main menu, cleaning up tracking state. */
  const handleReturnToMenu = () => {
    tracking.clearARScene();
    setAppState(APP_STATES.MENU);
  };

  // ─── View routing ────────────────────────────────────────────────────────────
  return (
    <div>
      {appState === APP_STATES.MENU && (
        <MenuView
          markers={markers}
          onTrack={() => setAppState(APP_STATES.TRACKING)}
          onDeleteMarker={handleDeleteMarker}
          onExit={onExit}
        />
      )}

      {appState === APP_STATES.TRACKING && (
        <TrackingView
          arContainerRef={tracking.arContainerRef}
          trackingMessage={tracking.trackingMessage}
          detectedMarkers={tracking.detectedMarkers}
          arError={arError}
          showCapturedOnly={showCapturedOnly}
          onToggleShowCapturedOnly={setShowCapturedOnly}
          onAssignMarker={handleAssignDetectedMarker}
          onBack={handleReturnToMenu}
          onExit={onExit}
        />
      )}
    </div>
  );
}
