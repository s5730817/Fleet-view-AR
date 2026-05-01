import { useState } from "react";
import { loadMarkers, saveMarkers } from "../markerStorage";

/**
 * Manages the persisted list of saved AR markers.
 *
 * Loads from localStorage on mount and provides a single save function
 * that keeps both localStorage and React state in sync.
 */
export const useMarkers = () => {
  // Initialize from localStorage synchronously so we don't race against early
  // user saves during first mount.
  const [markers, setMarkers] = useState(() => loadMarkers());

  /** Persist an updated marker list and sync React state in one call. */
  const saveMarkerList = (updatedMarkers) => {
    saveMarkers(updatedMarkers);
    setMarkers(updatedMarkers);
  };

  return { markers, saveMarkerList };
};
