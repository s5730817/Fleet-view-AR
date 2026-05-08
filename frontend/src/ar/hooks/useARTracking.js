import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import {
  APP_STATES,
  MATRIX_CODE_TYPE,
  TRACK_LOSS_THRESHOLD,
  TRACK_SMOOTHING,
} from "../constants";
import { getARCameraParamsUrl } from "@/lib/ar-offline-assets";
import { lerpVector, slerpQuaternion } from "../arHelpers";

const describeCameraBootstrapError = (error) => {
  if (!error) {
    return "Camera access could not be started.";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission was denied. Allow camera access for this site in the browser and OS settings, then try AR mode again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera device was found. Connect a camera and try again.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is already in use by another app or browser tab. Close other camera apps and retry.";
    case "SecurityError":
      return "Camera access is blocked because the app is not running in a secure context. Use localhost or start the frontend with HTTPS for AR.";
    default:
      return error.message || "Camera access could not be started.";
  }
};

const ensureCameraAccess = async () => {
  if (typeof window === "undefined") {
    throw new Error("Window is not available.");
  }

  if (!window.isSecureContext) {
    const insecureError = new Error("Camera access requires a secure context.");
    insecureError.name = "SecurityError";
    throw insecureError;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    const mediaError = new Error("This browser does not expose getUserMedia for the current origin.");
    mediaError.name = "SecurityError";
    throw mediaError;
  }

  const testStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
    },
    audio: false,
  });

  testStream.getTracks().forEach((track) => track.stop());
};

/**
 * Multi-marker tracker.
 *
 * For every unique barcode ID seen we create:
 *   - An ArMarkerControls-driven markerRoot (raw pose, updated by arContext)
 *   - A stableRoot that is lerped toward markerRoot for smooth rendering
 *   - A sprite label attached directly to stableRoot
 *
 * Labels render a large status circle over the marker, while the part
 * name is rendered in the UI above the aim helper.
 */
export const useARTracking = ({ appState, arReady, markers, showCapturedOnly }) => {
  const arContainerRef = useRef(null);
  const arStateRef = useRef({});
  // Map<id, { markerRoot, stableRoot, missCount, firstVisible, statusSprite, statusColor }>
  const markerEntriesRef = useRef(new Map());

  const [trackingMessage, setTrackingMessage] = useState("Point the camera at one or more markers.");
  const [detectedMarkers, setDetectedMarkers] = useState([]);
  const [centeredMarker, setCenteredMarker] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const clearARScene = () => {
    const s = arStateRef.current;

    if (s.animationId) {
      cancelAnimationFrame(s.animationId);
      s.animationId = null;
    }

    if (s.resizeListener) {
      window.removeEventListener("resize", s.resizeListener);
      s.resizeListener = null;
    }

    s.arSource?.domElement?.srcObject?.getTracks().forEach((t) => t.stop());

    if (s.arSource?.domElement?.parentNode) {
      s.arSource.domElement.parentNode.removeChild(s.arSource.domElement);
    }

    if (s.renderer?.domElement?.parentNode) {
      s.renderer.domElement.parentNode.removeChild(s.renderer.domElement);
    }

    s.renderer?.dispose();

    arStateRef.current = {};
    markerEntriesRef.current.clear();
    setDetectedMarkers([]);
    setCenteredMarker(null);
  };

  useEffect(() => {
    if (appState !== APP_STATES.TRACKING || !arReady) return undefined;

    let active = true;
    const container = arContainerRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || window.innerWidth || 640;
    const height = container.clientHeight || window.innerHeight || 480;

    const initScene = async () => {
      clearARScene();

      setCameraError(null);

      try {
        await ensureCameraAccess();
      } catch (error) {
        if (active) {
          const message = describeCameraBootstrapError(error);
          setCameraError(message);
          setTrackingMessage(message);
        }
        return;
      }

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
        arSource.domElement.style.marginLeft = "0px";
        arSource.domElement.style.marginTop = "0px";
        arSource.copyElementSizeTo(renderer.domElement);
        if (arStateRef.current.arContext?.arController) {
          arSource.copyElementSizeTo(arStateRef.current.arContext.arController.canvas);
        }
      };
      window.addEventListener("resize", onResize);

      const cameraParametersUrl = await getARCameraParamsUrl();

      const arContext = new window.THREEx.ArToolkitContext({
        cameraParametersUrl,
        detectionMode: "mono_and_matrix",
        matrixCodeType: MATRIX_CODE_TYPE,
        canvasWidth: 1280,
        canvasHeight: 720,
      });

      arSource.init(() => {
        if (!active) return;

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

        arSource.domElement.play?.().catch(() => {});
      });

      arContext.init(() => {
        camera.projectionMatrix.copy(arContext.getProjectionMatrix());
        onResize();
      });

      Object.assign(arStateRef.current, {
        renderer,
        scene,
        camera,
        arSource,
        arContext,
        resizeListener: onResize,
      });

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

      const getThemeColor = (tokenName, fallback) => {
        const rootStyle = window.getComputedStyle(document.documentElement);
        const bodyStyle = document.body ? window.getComputedStyle(document.body) : null;
        const rawValue = bodyStyle?.getPropertyValue(tokenName)?.trim() || rootStyle.getPropertyValue(tokenName).trim();

        return rawValue ? `hsl(${rawValue})` : fallback;
      };

      const getMarkerAccentColor = (matchedMarker, assigned) => {
        if (!assigned || !matchedMarker) {
          return getThemeColor("--muted-foreground", "#94a3b8");
        }

        if (matchedMarker.markerType === "part") {
          switch (matchedMarker.status) {
            case "Good":
              return getThemeColor("--status-good", "#22c55e");
            case "Requires Attention":
            case "Replacement Recommended":
              return getThemeColor("--status-service", "#f59e0b");
            case "Under Repair":
              return getThemeColor("--status-repair", "#ef4444");
            case "Needs Replacement!":
            case "Needs Fix or Replacement":
              return getThemeColor("--status-urgent", "#ef4444");
            default:
              return getThemeColor("--status-service", "#f59e0b");
          }
        }

        switch (matchedMarker.status) {
          case "available":
            return getThemeColor("--status-good", "#22c55e");
          case "in_use":
          case "awaiting_return":
            return getThemeColor("--status-service", "#f59e0b");
          case "maintenance":
            return getThemeColor("--status-urgent", "#ef4444");
          default:
            return getThemeColor("--status-service", "#f59e0b");
        }
      };

      const createStatusSprite = (accentColor) => {
        const statusCanvas = document.createElement("canvas");
        statusCanvas.width = 256;
        statusCanvas.height = 256;
        const ctx = statusCanvas.getContext("2d");
        if (!ctx) return null;

        ctx.beginPath();
        ctx.arc(128, 128, 92, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.34;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(128, 128, 92, 0, Math.PI * 2);
        ctx.lineWidth = 12;
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.stroke();

        const texture = new THREE.CanvasTexture(statusCanvas);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          sizeAttenuation: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.15, 0.15, 1);
        sprite.position.set(0, 0.02, 0);
        sprite.renderOrder = 90;
        return sprite;
      };

      const disposeSprite = (root, sprite) => {
        if (!sprite) return;
        if (sprite.material?.map) sprite.material.map.dispose();
        sprite.material?.dispose();
        root.remove(sprite);
      };

      const updateMarkerSprites = (entry, accentColor) => {
        if (entry.statusColor === accentColor && entry.statusSprite) {
          return;
        }

        if (entry.statusSprite) {
          disposeSprite(entry.stableRoot, entry.statusSprite);
          entry.statusSprite = null;
        }

        const statusSprite = createStatusSprite(accentColor);
        if (!statusSprite) return;

        entry.stableRoot.add(statusSprite);
        entry.statusSprite = statusSprite;
        entry.statusColor = accentColor;
      };

      /**
       * Lazily create ArMarkerControls + markerRoot + stableRoot for an ID.
       * Uses the same options as the original single-marker system.
       */
      const ensureMarkerEntry = (id) => {
        if (markerEntriesRef.current.has(id)) return;

        const markerRoot = new THREE.Group();
        scene.add(markerRoot);

        new window.THREEx.ArMarkerControls(arContext, markerRoot, {
          type: "barcode",
          barcodeValue: id,
          size: 1,
          changeMatrixMode: "modelViewMatrix",
        });

        const stableRoot = new THREE.Group();
        stableRoot.visible = false;
        scene.add(stableRoot);

        markerEntriesRef.current.set(id, {
          markerRoot,
          stableRoot,
          missCount: 0,
          firstVisible: true,
          statusSprite: null,
          statusColor: "",
        });
      };

      const animate = () => {
        if (!active) return;
        arStateRef.current.animationId = requestAnimationFrame(animate);

        if (!arSource.ready) {
          renderer.render(scene, camera);
          return;
        }

        arContext.update(arSource.domElement);

        const controller = arContext.arController;
        if (!controller) {
          renderer.render(scene, camera);
          return;
        }

        // Discover any new marker IDs and create entries for them.
        const markerCount = controller.getMarkerNum();
        for (let i = 0; i < markerCount; i += 1) {
          const info = controller.getMarker(i);
          if (info && info.idMatrix > -1) {
            ensureMarkerEntry(info.idMatrix);
          }
        }

        const markersByBarcode = new Map(markers.map((m) => [m.barcodeValue, m]));
        const nextDetected = [];
        const viewportWidth = renderer.domElement.clientWidth || window.innerWidth || 1;
        const viewportHeight = renderer.domElement.clientHeight || window.innerHeight || 1;
        const aimHalfSize = Math.min(viewportWidth, viewportHeight) * 0.12;
        const viewportCenterX = viewportWidth / 2;
        const viewportCenterY = viewportHeight / 2;
        const projectedPosition = new THREE.Vector3();

        for (const [id, entry] of markerEntriesRef.current.entries()) {
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

          const matchedMarker = markersByBarcode.get(id) || null;
          const assigned = Boolean(matchedMarker);

          if (showCapturedOnly && !assigned) {
            stableRoot.visible = false;
            continue;
          }

          const accentColor = getMarkerAccentColor(matchedMarker, assigned);
          updateMarkerSprites(entry, accentColor);
          projectedPosition.setFromMatrixPosition(stableRoot.matrixWorld).project(camera);
          const screenX = ((projectedPosition.x + 1) / 2) * viewportWidth;
          const screenY = ((1 - projectedPosition.y) / 2) * viewportHeight;
          const distanceToCenter = Math.hypot(screenX - viewportCenterX, screenY - viewportCenterY);
          const inAim = Math.abs(screenX - viewportCenterX) <= aimHalfSize && Math.abs(screenY - viewportCenterY) <= aimHalfSize;

          nextDetected.push({
            id,
            assigned,
            name: matchedMarker?.name || null,
            description: matchedMarker?.description || "",
            issuePoints: Array.isArray(matchedMarker?.issuePoints) ? matchedMarker.issuePoints : [],
            markerType: matchedMarker?.markerType || null,
            screenX,
            screenY,
            distanceToCenter,
            inAim,
          });
        }

        const detected = nextDetected;
        setDetectedMarkers(detected);
        setCenteredMarker(
          detected
            .filter((marker) => marker.assigned && marker.markerType === "part" && marker.inAim)
            .sort((left, right) => left.distanceToCenter - right.distanceToCenter)[0] || null
        );
        setTrackingMessage(
          detected.length > 0
            ? `Detected ${detected.length} marker${detected.length > 1 ? "s" : ""}${showCapturedOnly ? " (captured only)" : ""}.`
            : showCapturedOnly
              ? "No captured markers detected."
              : "No markers detected. Move closer and improve lighting.",
        );

        renderer.render(scene, camera);
      };

      arStateRef.current.animationId = requestAnimationFrame(animate);
    };

    initScene().catch((error) => {
      if (!active) {
        return;
      }

      const message = describeCameraBootstrapError(error);
      setCameraError(message);
      setTrackingMessage(message);
    });

    return () => {
      active = false;
      clearARScene();
    };
  }, [appState, arReady, markers, showCapturedOnly]);

  return {
    arContainerRef,
    trackingMessage,
    detectedMarkers,
    centeredMarker,
    cameraError,
    clearARScene,
  };
};
