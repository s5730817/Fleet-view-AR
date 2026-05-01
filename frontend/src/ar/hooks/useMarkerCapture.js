import { useState, useRef } from "react";
import * as THREE from "three";
import jsQR from "jsqr";
import { createInitialCorners } from "../markerEditor";
import { AR_CAMERA_PARAMS, MATRIX_CODE_TYPE, TRACK_SMOOTHING, TRACK_LOSS_THRESHOLD } from "../constants";
import { loadARjs } from "../arjsLoader";
import { computeScreenPosition, lerpVector, slerpQuaternion } from "../arHelpers";

const TARGET_BOX_RATIO = 0.34;
const TARGET_BOX_MIN = 150;
const TARGET_BOX_MAX = 280;

const getCaptureTargetBox = (width, height) => {
  const size = Math.max(TARGET_BOX_MIN, Math.min(TARGET_BOX_MAX, Math.min(width, height) * TARGET_BOX_RATIO));
  return {
    x: (width - size) / 2,
    y: (height - size) / 2,
    size,
  };
};

/**
 * Handles freeze-frame capture from the live video element.
 *
 * Responsibilities:
 *  - Draw the current video frame onto a hidden canvas
 *  - Run jsQR to detect any QR code in the frame (informational only)
 *  - Expose the captured data URL and crop corner state for the editor
 */
export const useMarkerCapture = () => {
  const arContainerRef = useRef(null);
  const liveArStateRef = useRef({});
  const canvasRef = useRef(null);
  const liveScanFrameRef = useRef(null);
  const liveMarkerStateRef = useRef(new Map());
  const liveArRef = useRef({
    context: null,
    initPromise: null,
  });
  const decodeArRef = useRef({
    context: null,
    initPromise: null,
    width: 0,
    height: 0,
  });

  const [markerPreviewUrl, setMarkerPreviewUrl] = useState("");
  const [capturedQrData, setCapturedQrData] = useState(null);
  const [detectedBarcodeValue, setDetectedBarcodeValue] = useState(null);
  const [barcodeMatchMarker, setBarcodeMatchMarker] = useState(null);
  const [barcodeDetectionPending, setBarcodeDetectionPending] = useState(false);
  const [barcodeDetectionError, setBarcodeDetectionError] = useState(null);
  const [barcodeDebugInfo, setBarcodeDebugInfo] = useState([]);
  const [lastDecodeSource, setLastDecodeSource] = useState(null);
  const [liveDetectedMarkers, setLiveDetectedMarkers] = useState([]);
  const [targetMarker, setTargetMarker] = useState(null);
  const targetMarkerRef = useRef(null);
  const [liveReady, setLiveReady] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [captureDimensions, setCaptureDimensions] = useState({ width: 0, height: 0 });
  const [editCorners, setEditCorners] = useState(createInitialCorners(640, 480));
  const [captureError, setCaptureError] = useState(null);

  const ensureLiveArDecoder = async () => {
    await loadARjs();

    const hasRuntime = typeof window !== "undefined" && window.THREEx?.ArToolkitContext;
    if (!hasRuntime) {
      throw new Error("AR runtime is not ready yet.");
    }

    if (!liveArRef.current.initPromise) {
      const context = new window.THREEx.ArToolkitContext({
        cameraParametersUrl: AR_CAMERA_PARAMS,
        detectionMode: "mono_and_matrix",
        matrixCodeType: MATRIX_CODE_TYPE,
        // Match the tracking hook processing canvas exactly.
        canvasWidth: 1280,
        canvasHeight: 720,
      });

      liveArRef.current.context = context;
      liveArRef.current.initPromise = new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error("ARToolkit decoder initialization timed out."));
        }, 8000);

        context.init(() => {
          window.clearTimeout(timeout);
          resolve(context);
        });
      });
    }

    return liveArRef.current.initPromise;
  };

  const ensureDecodeArDecoder = async (width, height) => {
    await loadARjs();

    const hasRuntime = typeof window !== "undefined" && window.THREEx?.ArToolkitContext;
    if (!hasRuntime) {
      throw new Error("AR runtime is not ready yet.");
    }

    const sizeChanged = decodeArRef.current.width !== width || decodeArRef.current.height !== height;
    if (!decodeArRef.current.context || sizeChanged) {
      decodeArRef.current.context = null;
      decodeArRef.current.initPromise = null;
    }

    if (!decodeArRef.current.initPromise) {
      const context = new window.THREEx.ArToolkitContext({
        cameraParametersUrl: AR_CAMERA_PARAMS,
        detectionMode: "mono_and_matrix",
        matrixCodeType: MATRIX_CODE_TYPE,
        canvasWidth: width,
        canvasHeight: height,
      });

      decodeArRef.current.context = context;
      decodeArRef.current.width = width;
      decodeArRef.current.height = height;

      decodeArRef.current.initPromise = new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error("ARToolkit decoder initialization timed out."));
        }, 8000);

        context.init(() => {
          window.clearTimeout(timeout);
          resolve(context);
        });
      });
    }

    return decodeArRef.current.initPromise;
  };

  const getBarcodeInfoFromController = (controller) => {
    if (!controller) {
      return { detected: null, markerCount: 0, markers: [] };
    }

    const markerCount = controller.getMarkerNum();
    const markers = [];
    let detected = null;

    for (let i = 0; i < markerCount; i += 1) {
      const markerInfo = controller.getMarker(i);
      if (!markerInfo) continue;

      const asMatrix = Number.isFinite(markerInfo.idMatrix) ? markerInfo.idMatrix : null;
      const asId = Number.isFinite(markerInfo.id) ? markerInfo.id : null;
      const asPattern = Number.isFinite(markerInfo.idPatt) ? markerInfo.idPatt : null;

      let selected = null;

      // Most ARToolkit builds expose barcode IDs through idMatrix.
      if (markerInfo.idMatrix > -1) {
        selected = markerInfo.idMatrix;
      }

      // Fallback for runtimes that encode barcode IDs in id.
      if (selected === null && markerInfo.idPatt === -1 && markerInfo.id > -1) {
        selected = markerInfo.id;
      }

      if (detected === null && Number.isFinite(selected)) {
        detected = selected;
      }

      markers.push({
        index: i,
        id: asId,
        idPatt: asPattern,
        idMatrix: asMatrix,
        selected,
      });
    }

    return { detected, markerCount, markers };
  };

  const stopLiveDetection = () => {
    const live = liveArStateRef.current;

    if (liveScanFrameRef.current) {
      cancelAnimationFrame(liveScanFrameRef.current);
      liveScanFrameRef.current = null;
    }

    if (live.resizeListener) {
      window.removeEventListener("resize", live.resizeListener);
      live.resizeListener = null;
    }

    live.arSource?.domElement?.srcObject?.getTracks().forEach((t) => t.stop());

    if (live.arSource?.domElement?.parentNode) {
      live.arSource.domElement.parentNode.removeChild(live.arSource.domElement);
    }

    if (live.renderer?.domElement?.parentNode) {
      live.renderer.domElement.parentNode.removeChild(live.renderer.domElement);
    }

    live.renderer?.dispose();

    liveArStateRef.current = {};
    liveMarkerStateRef.current.clear();
    // Reset the live arContext so the next session creates fresh ArMarkerControls.
    liveArRef.current.context = null;
    liveArRef.current.initPromise = null;
    targetMarkerRef.current = null;
    setTargetMarker(null);
    setLiveReady(false);
    setLiveError(null);
    setLiveDetectedMarkers([]);
  };

  /**
   * Start live AR marker detection over the video element.
   *
   * Creates a Three.js renderer canvas overlaid on the video's parent container
   * and drives it with ArMarkerControls — identical to the tracking screen gizmo
    * system. Marker IDs are attached as Sprite labels directly to each gizmo.
   */
  const startLiveDetection = (existingMarkers = []) => {
    stopLiveDetection();
    setLiveError(null);

    const container = arContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth || 640;
    const height = container.clientHeight || window.innerHeight || 480;

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "1",
      pointerEvents: "none",
    });

    const arSource = new window.THREEx.ArToolkitSource({
      sourceType: "webcam",
      sourceWidth: 1280,
      sourceHeight: 720,
      displayWidth: width,
      displayHeight: height,
    });

    const onResize = () => {
      if (!arSource || !renderer) return;
      arSource.onResizeElement();
      arSource.copyElementSizeTo(renderer.domElement);
      if (liveArRef.current.context?.arController) {
        arSource.copyElementSizeTo(liveArRef.current.context.arController.canvas);
      }
    };
    window.addEventListener("resize", onResize);

    arSource.init(() => {
      Object.assign(arSource.domElement.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        objectFit: "fill",
        zIndex: "0",
        display: "block",
      });
      arSource.domElement.muted = true;
      arSource.domElement.setAttribute("playsinline", "true");

      container.appendChild(arSource.domElement);
      container.appendChild(renderer.domElement);
      onResize();
      arSource.domElement
        .play?.()
        .then(() => setLiveReady(true))
        .catch(() => {
          setLiveError("Unable to start camera stream.");
        });
    });

    /** Build gizmo meshes identical to the tracking-screen gizmo. */
    const drawRoundedRect = (ctx, x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const createLabelSprite = (id, assigned) => {
      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 256;
      labelCanvas.height = 128;
      const ctx = labelCanvas.getContext("2d");
      if (!ctx) return null;

      // Capture mode convention: assigned red, unassigned green.
      const bg = assigned ? "rgba(220,53,69,0.94)" : "rgba(46,204,113,0.94)";
      drawRoundedRect(ctx, 10, 20, 236, 88, 30);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 62px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(id), 128, 64);

      const texture = new THREE.CanvasTexture(labelCanvas);
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.45, 0.22, 1);
      sprite.position.set(0, 0.24, 0);
      sprite.renderOrder = 100;
      return sprite;
    };

    const createGizmo = () => {
      const group = new THREE.Group();

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.28, 48),
        new THREE.MeshBasicMaterial({ color: 0x00e0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
      );
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);

      const fill = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 32),
        new THREE.MeshBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
      );
      fill.rotation.x = -Math.PI / 2;
      group.add(fill);

      const axes = new THREE.AxesHelper(0.35);
      axes.position.y = 0.01;
      group.add(axes);

      return group;
    };

    // Map<id, { markerRoot, stableRoot, missCount, firstVisible }>
    const markerEntries = new Map();
    let lastArContext = null;
    let projectionReady = false;

    const updateLabelSprite = (entry, id, assigned) => {
      if (entry.labelAssigned === assigned && entry.labelSprite) return;
      if (entry.labelSprite) {
        if (entry.labelSprite.material?.map) entry.labelSprite.material.map.dispose();
        entry.labelSprite.material?.dispose();
        entry.stableRoot.remove(entry.labelSprite);
        entry.labelSprite = null;
      }

      const sprite = createLabelSprite(id, assigned);
      if (!sprite) return;
      entry.stableRoot.add(sprite);
      entry.labelSprite = sprite;
      entry.labelAssigned = assigned;
    };

    const ensureMarkerEntry = (arContext, id) => {
      if (markerEntries.has(id)) return;

      const markerRoot = new THREE.Group();
      scene.add(markerRoot);

      // eslint-disable-next-line no-new
      new window.THREEx.ArMarkerControls(arContext, markerRoot, {
        type: "barcode",
        barcodeValue: id,
        size: 1,
        changeMatrixMode: "modelViewMatrix",
      });

      const stableRoot = new THREE.Group();
      stableRoot.visible = false;
      scene.add(stableRoot);

      const gizmo = createGizmo();
      stableRoot.add(gizmo);

      markerEntries.set(id, {
        markerRoot,
        stableRoot,
        missCount: 0,
        firstVisible: true,
        labelSprite: null,
        labelAssigned: null,
      });
    };

    const step = async () => {
      if (!arSource.ready) {
        renderer.render(scene, camera);
        liveScanFrameRef.current = requestAnimationFrame(step);
        return;
      }

      try {
        const arContext = await ensureLiveArDecoder();

        if (arContext !== lastArContext) {
          lastArContext = arContext;
          markerEntries.clear();
          projectionReady = false;
        }

        if (!projectionReady) {
          try {
            camera.projectionMatrix.copy(arContext.getProjectionMatrix());
            projectionReady = true;
          } catch {
            // Retry next frame.
          }
        }

        // Use direct AR source updates, matching tracking mode exactly.
        arContext.update(arSource.domElement);
        const controller = arContext.arController;
        if (!controller) {
          renderer.render(scene, camera);
          liveScanFrameRef.current = requestAnimationFrame(step);
          return;
        }

        const assignedIds = new Set(existingMarkers.map((m) => m.barcodeValue));
        const detected = [];
        const displayW = arSource.domElement?.clientWidth || width;
        const displayH = arSource.domElement?.clientHeight || height;
        const targetBox = getCaptureTargetBox(displayW, displayH);
        let bestTarget = null;

        // Create entries for any newly-seen marker IDs.
        const markerCount = controller.getMarkerNum();
        for (let i = 0; i < markerCount; i += 1) {
          const info = controller.getMarker(i);
          if (info && info.idMatrix > -1) {
            ensureMarkerEntry(arContext, info.idMatrix);
          }
        }

        if (projectionReady) {
          for (const [id, entry] of markerEntries.entries()) {
            const { markerRoot, stableRoot } = entry;

            if (markerRoot.visible) {
              entry.missCount = 0;
              stableRoot.visible = true;

              if (entry.firstVisible) {
                stableRoot.position.copy(markerRoot.position);
                stableRoot.quaternion.copy(markerRoot.quaternion);
                stableRoot.scale.copy(markerRoot.scale);
                entry.firstVisible = false;
              } else {
                lerpVector(stableRoot.position, markerRoot.position, TRACK_SMOOTHING);
                slerpQuaternion(stableRoot.quaternion, markerRoot.quaternion, TRACK_SMOOTHING);
                lerpVector(stableRoot.scale, markerRoot.scale, TRACK_SMOOTHING);
              }
            } else {
              entry.missCount += 1;
              if (entry.missCount >= TRACK_LOSS_THRESHOLD) {
                stableRoot.visible = false;
              }
            }

            if (!stableRoot.visible) continue;

            const assigned = assignedIds.has(id);
            updateLabelSprite(entry, id, assigned);
            const worldPos = stableRoot.getWorldPosition(new THREE.Vector3());
            const { screenX, screenY, onScreen } = computeScreenPosition(worldPos, camera, displayW, displayH);
            const inTarget =
              onScreen &&
              screenX >= targetBox.x &&
              screenX <= targetBox.x + targetBox.size &&
              screenY >= targetBox.y &&
              screenY <= targetBox.y + targetBox.size;

            if (inTarget) {
              const dx = screenX - (targetBox.x + targetBox.size / 2);
              const dy = screenY - (targetBox.y + targetBox.size / 2);
              const distSq = dx * dx + dy * dy;
              if (!bestTarget || distSq < bestTarget.distSq) {
                bestTarget = { id, assigned, x: screenX, y: screenY, distSq };
              }
            }

            detected.push({
              id,
              assigned,
              x: screenX,
              y: screenY,
              inTarget,
            });
          }
        }

        liveMarkerStateRef.current.clear();
        for (const m of detected) liveMarkerStateRef.current.set(m.id, m);
        targetMarkerRef.current = bestTarget ? { id: bestTarget.id, assigned: bestTarget.assigned } : null;
        setTargetMarker(targetMarkerRef.current);
        setLiveDetectedMarkers(detected);

        renderer.render(scene, camera);
      } catch {
        // Keep scanning; capture mode can start before AR runtime is fully ready.
      }

      liveScanFrameRef.current = requestAnimationFrame(step);
    };

    liveArStateRef.current = {
      scene,
      camera,
      renderer,
      arSource,
      resizeListener: onResize,
    };

    liveScanFrameRef.current = requestAnimationFrame(step);
  };

  const buildDetectionCandidates = (sourceCanvas) => {
    const candidates = [sourceCanvas];

    const { width, height } = sourceCanvas;
    const cx = width / 2;
    const cy = height / 2;

    const makeCanvas = () => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      return c;
    };

    // Candidate 2: center crop (80%) stretched back to full frame.
    {
      const c = makeCanvas();
      const ctx = c.getContext("2d");
      if (ctx) {
        const cropW = width * 0.8;
        const cropH = height * 0.8;
        ctx.drawImage(sourceCanvas, cx - cropW / 2, cy - cropH / 2, cropW, cropH, 0, 0, width, height);
        candidates.push(c);
      }
    }

    // Candidate 3: center crop (60%) stretched back to full frame.
    {
      const c = makeCanvas();
      const ctx = c.getContext("2d");
      if (ctx) {
        const cropW = width * 0.6;
        const cropH = height * 0.6;
        ctx.drawImage(sourceCanvas, cx - cropW / 2, cy - cropH / 2, cropW, cropH, 0, 0, width, height);
        candidates.push(c);
      }
    }

    // Candidate 4: high-contrast grayscale to improve border segmentation.
    {
      const c = makeCanvas();
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(sourceCanvas, 0, 0, width, height);
        const img = ctx.getImageData(0, 0, width, height);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const boosted = gray < 100 ? 0 : gray > 155 ? 255 : gray;
          d[i] = boosted;
          d[i + 1] = boosted;
          d[i + 2] = boosted;
        }
        ctx.putImageData(img, 0, 0);
        candidates.push(c);
      }
    }

    return candidates;
  };

  const detectBarcodeFromCanvas = async (canvas) => {
    const candidates = buildDetectionCandidates(canvas);
    const debug = [];

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const width = candidate.width;
      const height = candidate.height;
      const context = await ensureDecodeArDecoder(width, height);

      // Feed each candidate image into ARToolkit marker detection.
      context.update(candidate);
      const info = getBarcodeInfoFromController(context.arController);
      const label =
        index === 0
          ? "raw-frame"
          : index === 1
            ? "center-crop-80"
            : index === 2
              ? "center-crop-60"
              : "contrast-grayscale";

      debug.push({
        candidate: label,
        markerCount: info.markerCount,
        detected: info.detected,
        markers: info.markers,
      });

      const detected = info.detected;
      if (Number.isFinite(detected)) {
        return { detectedBarcode: detected, debug };
      }
    }

    return { detectedBarcode: null, debug };
  };

  const decodeBarcodeFromDataUrl = async (dataUrl, existingMarkers = []) => {
    setBarcodeDetectionPending(true);
    setBarcodeDetectionError(null);
    setBarcodeMatchMarker(null);
    setLastDecodeSource("cropped-image");

    try {
      const img = new Image();
      img.decoding = "async";
      const loaded = new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load cropped preview for decode."));
      });
      img.src = dataUrl;
      await loaded;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.naturalWidth || img.width;
      tempCanvas.height = img.naturalHeight || img.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) {
        throw new Error("Canvas context unavailable while decoding cropped preview.");
      }

      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      const { detectedBarcode, debug } = await detectBarcodeFromCanvas(tempCanvas);
      setBarcodeDebugInfo(debug);

      if (Number.isFinite(detectedBarcode)) {
        setDetectedBarcodeValue(detectedBarcode);
        const existing = existingMarkers.find((m) => m.barcodeValue === detectedBarcode) ?? null;
        setBarcodeMatchMarker(existing);
        return detectedBarcode;
      }

      setBarcodeDetectionError(
        "Live-frame decode failed and cropped-image decode also failed. Try tighter crop around the marker border.",
      );
      return null;
    } catch (error) {
      console.error("decodeBarcodeFromDataUrl failed", error);
      setBarcodeDetectionError("Failed to decode barcode from cropped image.");
      return null;
    } finally {
      setBarcodeDetectionPending(false);
    }
  };

  /**
   * Capture a still from the passed video element, run QR detection,
   * and store a data URL of the result.
   * @param {HTMLVideoElement} videoElement
   */
  const captureFrame = async (existingMarkers = []) => {
    setCaptureError(null);
    setBarcodeDetectionError(null);
    setBarcodeDebugInfo([]);
    setLastDecodeSource("target-square-live");
    setBarcodeMatchMarker(null);
    setDetectedBarcodeValue(null);

    const videoElement = liveArStateRef.current.arSource?.domElement;

    if (!videoElement || !canvasRef.current) {
      setCaptureError("Unable to capture marker: camera not ready.");
      return;
    }

    const selectedTarget = targetMarkerRef.current;
    if (!selectedTarget || !Number.isFinite(selectedTarget.id)) {
      setCaptureError("Center a marker in the target square before capture.");
      return;
    }

    // Fall back to client dimensions if the video dimensions are not yet available.
    const width = videoElement.videoWidth || videoElement.clientWidth || 640;
    const height = videoElement.videoHeight || videoElement.clientHeight || 480;

    if (!width || !height) {
      setCaptureError("Unable to capture marker: invalid video dimensions.");
      return;
    }

    try {
      canvasRef.current.width = width;
      canvasRef.current.height = height;

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) {
        setCaptureError("Unable to capture marker: canvas context unavailable.");
        return;
      }

      // Draw the current video frame.
      ctx.drawImage(videoElement, 0, 0, width, height);

      // Attempt QR code detection — does not block saving if no QR is found.
      const imageData = ctx.getImageData(0, 0, width, height);
      const qr = jsQR(imageData.data, width, height, { inversionAttempts: "attemptBoth" });
      setCapturedQrData(qr?.data ?? null);

      const capturedId = selectedTarget.id;
      setDetectedBarcodeValue(capturedId);
      const existing = existingMarkers.find((m) => m.barcodeValue === capturedId) ?? null;
      setBarcodeMatchMarker(existing);

      setMarkerPreviewUrl(canvasRef.current.toDataURL("image/png"));
      setCaptureDimensions({ width, height });
      // Reset crop corners to the full image boundary.
      setEditCorners(createInitialCorners(width, height));
    } catch (error) {
      console.error("captureFrame failed", error);
      setCaptureError("Unable to capture marker. See console for details.");
    }
  };

  /** Discard the current capture so the user can try again. */
  const resetCapture = () => {
    setMarkerPreviewUrl("");
    setCapturedQrData(null);
    setDetectedBarcodeValue(null);
    setBarcodeMatchMarker(null);
    setBarcodeDetectionPending(false);
    setBarcodeDetectionError(null);
    setBarcodeDebugInfo([]);
    setLastDecodeSource(null);
    setCaptureDimensions({ width: 0, height: 0 });
    setEditCorners(createInitialCorners(640, 480));
    setCaptureError(null);
    targetMarkerRef.current = null;
    setTargetMarker(null);
    stopLiveDetection();
  };

  return {
    arContainerRef,
    liveReady,
    liveError,
    canvasRef,
    markerPreviewUrl,
    setMarkerPreviewUrl,
    capturedQrData,
    detectedBarcodeValue,
    barcodeMatchMarker,
    barcodeDetectionPending,
    barcodeDetectionError,
    barcodeDebugInfo,
    lastDecodeSource,
    liveDetectedMarkers,
    targetMarker,
    captureDimensions,
    setCaptureDimensions,
    editCorners,
    setEditCorners,
    captureError,
    captureFrame,
    decodeBarcodeFromDataUrl,
    startLiveDetection,
    stopLiveDetection,
    resetCapture,
  };
};
