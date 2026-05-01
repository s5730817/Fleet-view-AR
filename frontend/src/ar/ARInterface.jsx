import { useEffect, useState } from "react";
import { createMarker } from "./markerStorage";
import { APP_STATES } from "./constants";
import { useMarkers } from "./hooks/useMarkers";
import { useMarkerCapture } from "./hooks/useMarkerCapture";
import { useMarkerEditor } from "./hooks/useMarkerEditor";
import { useAREngine } from "./hooks/useAREngine";
import { useARTracking } from "./hooks/useARTracking";
import { MenuView } from "./views/MenuView";
import { CaptureView } from "./views/CaptureView";
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
 *   selectedMarkerId  - which marker is active (for tracking)
 *   capture form fields (markerName, markerDescription)
 *   saveError         - error from handleSaveMarker
 */
export default function ARInterface({ onExit }) {
  // ─── Navigation state ────────────────────────────────────────────────────────
  const [appState, setAppState] = useState(APP_STATES.MENU);

  // ─── Capture form state ──────────────────────────────────────────────────────
  const [markerName, setMarkerName] = useState("");
  const [markerDescription, setMarkerDescription] = useState("");
  const [saveError, setSaveError] = useState(null);
  const [showCapturedOnly, setShowCapturedOnly] = useState(false);

  // ─── Domain hooks ────────────────────────────────────────────────────────────
  const { markers, saveMarkerList } = useMarkers();

  const captureState = useMarkerCapture();
  const editor = useMarkerEditor({
    markerPreviewUrl: captureState.markerPreviewUrl,
    setMarkerPreviewUrl: captureState.setMarkerPreviewUrl,
    editCorners: captureState.editCorners,
    setEditCorners: captureState.setEditCorners,
    captureDimensions: captureState.captureDimensions,
    setCaptureDimensions: captureState.setCaptureDimensions,
    // Capture ID now comes from the live target marker in the center box.
    // Cropping is visual-only and should not re-run barcode decoding.
    onAfterCrop: async () => {},
  });

  const { arReady, arError } = useAREngine();
  const tracking = useARTracking({ appState, arReady, markers, showCapturedOnly });

  useEffect(() => {
    if (appState !== APP_STATES.CAPTURE || !arReady) {
      captureState.stopLiveDetection();
      return undefined;
    }

    captureState.startLiveDetection(markers);
    return () => captureState.stopLiveDetection();
  }, [appState, arReady, markers]);

  // ─── Navigation callbacks ────────────────────────────────────────────────────

  const resetCaptureForm = () => {
    captureState.resetCapture();
    setMarkerName("");
    setMarkerDescription("");
    setSaveError(null);
  };

  /** Persist the captured (and optionally cropped) frame as a new marker entry. */
  const handleSaveMarker = () => {
    setSaveError(null);
    if (!captureState.markerPreviewUrl) {
      setSaveError("No captured marker image to save.");
      return;
    }

    if (!Number.isFinite(captureState.detectedBarcodeValue)) {
      setSaveError("Unable to save: barcode ID was not detected from the captured marker.");
      return;
    }

    if (captureState.barcodeMatchMarker) {
      setSaveError(
        `Marker already exists for barcode ID ${captureState.detectedBarcodeValue} (${captureState.barcodeMatchMarker.name}).`,
      );
      return;
    }

    try {
      const newMarker = createMarker({
        name: markerName,
        description: markerDescription,
        imageUrl: captureState.markerPreviewUrl,
        barcodeValue: captureState.detectedBarcodeValue,
      });
      saveMarkerList([newMarker, ...markers]);

      // Reset the capture form ready for the next marker.
      resetCaptureForm();
      setAppState(APP_STATES.MENU);
    } catch (error) {
      console.error("saveMarker failed", error);
      setSaveError("Failed to save marker. See console for details.");
    }
  };

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
          onCapture={() => setAppState(APP_STATES.CAPTURE)}
          onTrack={() => setAppState(APP_STATES.TRACKING)}
          onDeleteMarker={handleDeleteMarker}
          onExit={onExit}
        />
      )}

      {appState === APP_STATES.CAPTURE && (
        <CaptureView
          arContainerRef={captureState.arContainerRef}
          videoReady={captureState.liveReady}
          cameraError={captureState.liveError}
          canvasRef={captureState.canvasRef}
          captureError={captureState.captureError}
          markerPreviewUrl={captureState.markerPreviewUrl}
          capturedQrData={captureState.capturedQrData}
          markerName={markerName}
          setMarkerName={setMarkerName}
          markerDescription={markerDescription}
          setMarkerDescription={setMarkerDescription}
          detectedBarcodeValue={captureState.detectedBarcodeValue}
          barcodeMatchMarker={captureState.barcodeMatchMarker}
          barcodeDetectionPending={captureState.barcodeDetectionPending}
          barcodeDetectionError={captureState.barcodeDetectionError}
          barcodeDebugInfo={captureState.barcodeDebugInfo}
          lastDecodeSource={captureState.lastDecodeSource}
          liveDetectedMarkers={captureState.liveDetectedMarkers}
          targetMarker={captureState.targetMarker}
          saveError={saveError}
          onSave={handleSaveMarker}
          onCapture={() => captureState.captureFrame(markers)}
          onBack={() => {
            resetCaptureForm();
            setAppState(APP_STATES.MENU);
          }}
          onExit={onExit}
          isEditing={editor.isEditing}
          setIsEditing={editor.setIsEditing}
          editor={editor}
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
