import { useState, useRef, useEffect } from "react";
import { applyCropToDataUrl } from "../markerEditor";

/**
 * Manages the perspective-crop editor modal.
 *
 * Responsibilities:
 *  - Track whether the modal is open (isEditing)
 *  - Keep previewDisplaySize in sync with the rendered <img> dimensions
 *    so pointer coordinates can be mapped correctly to capture-pixel space
 *  - Compute displayCorners (pixel positions on screen) from editCorners
 *    (positions in capture space) for the SVG overlay and handle placement
 *  - Handle pointer drag events on the four corner handles
 *  - Apply the perspective warp when the user confirms the crop
 *
 * @param {object} params
 * @param {string}   params.markerPreviewUrl
 * @param {Function} params.setMarkerPreviewUrl
 * @param {object[]} params.editCorners        - array of {x,y} in capture pixels
 * @param {Function} params.setEditCorners
 * @param {object}   params.captureDimensions  - {width, height} of the raw capture
 * @param {Function} params.setCaptureDimensions
 * @param {Function} [params.onAfterCrop]      - optional callback receiving
 *                                               cropped data URL
 */
export const useMarkerEditor = ({
  markerPreviewUrl,
  setMarkerPreviewUrl,
  editCorners,
  setEditCorners,
  captureDimensions,
  setCaptureDimensions,
  onAfterCrop,
}) => {
  const modalPreviewImageRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draggingCorner, setDraggingCorner] = useState(null);
  const [previewDisplaySize, setPreviewDisplaySize] = useState({ width: 0, height: 0 });
  const [editError, setEditError] = useState(null);

  // ─── Sync previewDisplaySize with the rendered <img> element ──────────────
  // Uses ResizeObserver to react to container / layout changes; falls back to
  // a window-resize listener when ResizeObserver is not supported.
  useEffect(() => {
    if (!isEditing) return undefined;

    const sync = () => {
      const node = modalPreviewImageRef.current;
      if (!node) return;
      const { width, height } = node.getBoundingClientRect();
      setPreviewDisplaySize({ width, height });
    };

    sync();

    let observer;
    if (typeof ResizeObserver !== "undefined" && modalPreviewImageRef.current) {
      observer = new ResizeObserver(sync);
      observer.observe(modalPreviewImageRef.current);
    }

    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      observer?.disconnect();
    };
  }, [isEditing, markerPreviewUrl]);

  // ─── Map stored corners (capture pixels) → display pixels ─────────────────
  // Used to position SVG polygon vertices and drag handles on screen.
  const displayCorners =
    previewDisplaySize.width > 0 && captureDimensions.width > 0 && captureDimensions.height > 0
      ? editCorners.map((c) => ({
          x: (c.x / captureDimensions.width) * previewDisplaySize.width,
          y: (c.y / captureDimensions.height) * previewDisplaySize.height,
        }))
      : [];

  // ─── Convert pointer screen coordinates → capture-pixel coordinates ────────
  const updateCorner = (index, clientX, clientY) => {
    const node = modalPreviewImageRef.current;
    if (!node || !captureDimensions.width || !captureDimensions.height) return;

    const rect = node.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(captureDimensions.width, ((clientX - rect.left) / rect.width) * captureDimensions.width),
    );
    const y = Math.max(
      0,
      Math.min(captureDimensions.height, ((clientY - rect.top) / rect.height) * captureDimensions.height),
    );
    setEditCorners((prev) => prev.map((c, i) => (i === index ? { x, y } : c)));
  };

  const handlePointerMove = (e) => {
    if (draggingCorner !== null) updateCorner(draggingCorner, e.clientX, e.clientY);
  };

  const handlePointerUp = () => setDraggingCorner(null);

  // Called by the <img> onLoad so displayCorners are accurate on first render.
  const handlePreviewImageLoad = (e) => {
    const { width, height } = e.currentTarget.getBoundingClientRect();
    setPreviewDisplaySize({ width, height });
  };

  // ─── Apply the perspective warp ────────────────────────────────────────────
  // Replaces the preview URL with the warped / cropped version.
  const applyCrop = async () => {
    setEditError(null);
    try {
      const cropped = await applyCropToDataUrl(
        markerPreviewUrl,
        editCorners,
        captureDimensions.width,
        captureDimensions.height,
      );
      setMarkerPreviewUrl(cropped);
      setCaptureDimensions({ width: 0, height: 0 });
      setIsEditing(false);
      if (typeof onAfterCrop === "function") {
        await onAfterCrop(cropped);
      }
    } catch (error) {
      console.error("applyCrop failed", error);
      setEditError("Unable to crop marker image. See console for details.");
    }
  };

  return {
    modalPreviewImageRef,
    isEditing,
    setIsEditing,
    draggingCorner,
    setDraggingCorner,
    previewDisplaySize,
    displayCorners,
    editError,
    handlePointerMove,
    handlePointerUp,
    handlePreviewImageLoad,
    applyCrop,
  };
};
