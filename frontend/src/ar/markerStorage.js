/**
 * markerStorage.js — localStorage read/write for the saved-marker list.
 *
 * All markers are normalised on read so that missing or legacy fields
 * never cause runtime errors higher up the call stack.
 */

const STORAGE_KEY = "arMarkers";

const normalizeIssuePoint = (issuePoint) => ({
  id: issuePoint.id || Date.now().toString(),
  title: issuePoint.title || "Untitled issue",
  description: issuePoint.description || "",
  status: issuePoint.status || "reported",
  priority: issuePoint.priority || "medium",
  latestComment: issuePoint.latestComment || "",
  createdAt: issuePoint.createdAt || new Date().toISOString(),
});

// Fill in missing / legacy fields so callers can rely on a consistent shape.
const normalizeMarker = (marker) => ({
  id: marker.id || Date.now().toString(),
  name: marker.name || "Saved marker",
  description: marker.description || "",
  imageUrl: marker.imageUrl || "",
  barcodeValue: Number.isFinite(marker.barcodeValue) ? marker.barcodeValue : 0,
  issuePoints: Array.isArray(marker.issuePoints)
    ? marker.issuePoints.map(normalizeIssuePoint)
    : [],
});

/** Valid AR.js 3×3 barcode IDs (0–15) available for assignment to a marker. */
export const BARCODE_MARKER_OPTIONS = Array.from({ length: 16 }, (_, index) => index);

export const loadMarkers = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeMarker);
  } catch (error) {
    console.warn("Failed to load saved markers", error);
    return [];
  }
};

export const saveMarkers = (updatedMarkers) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMarkers));
  } catch (error) {
    console.error("Failed to save marker data", error);
  }
  return updatedMarkers;
};

export const createMarker = ({ name, description, imageUrl, barcodeValue, issuePoints = [] }) => ({
  id: Date.now().toString(),
  name: name.trim() || `Marker ${Date.now()}`,
  description: description.trim() || "Saved marker",
  imageUrl,
  barcodeValue,
  issuePoints: issuePoints.map(normalizeIssuePoint),
});
