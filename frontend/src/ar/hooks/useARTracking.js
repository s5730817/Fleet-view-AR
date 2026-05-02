import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import {
  APP_STATES,
  AR_CAMERA_PARAMS,
  MATRIX_CODE_TYPE,
  TRACK_LOSS_THRESHOLD,
  TRACK_SMOOTHING,
} from "../constants";
import { lerpVector, slerpQuaternion } from "../arHelpers";

/**
 * Multi-marker tracker.
 *
 * For every unique barcode ID seen we create:
 *   - An ArMarkerControls-driven markerRoot (raw pose, updated by arContext)
 *   - A stableRoot that is lerped toward markerRoot for smooth rendering
 *   - Gizmo meshes (ring + fill + axes) attached to stableRoot
 *
 * Marker IDs are rendered as sprite labels attached directly to stableRoot,
 * keeping annotation and gizmo in the same 3D transform.
 */
export const useARTracking = ({ appState, arReady, markers, showCapturedOnly }) => {
  const arContainerRef = useRef(null);
  const arStateRef = useRef({});
  // Map<id, { markerRoot, stableRoot, missCount, firstVisible, labelSprite, labelAssigned, labelText }>
  const markerEntriesRef = useRef(new Map());

  const [trackingMessage, setTrackingMessage] = useState("Point the camera at one or more markers.");
  const [detectedMarkers, setDetectedMarkers] = useState([]);

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
  };

  useEffect(() => {
    if (appState !== APP_STATES.TRACKING || !arReady) return undefined;

    let active = true;
    const container = arContainerRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || window.innerWidth || 640;
    const height = container.clientHeight || window.innerHeight || 480;

    const initScene = () => {
      clearARScene();

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

      const arContext = new window.THREEx.ArToolkitContext({
        cameraParametersUrl: AR_CAMERA_PARAMS,
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

      const createLabelSprite = (text, assigned) => {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 512;
        labelCanvas.height = 128;
        const ctx = labelCanvas.getContext("2d");
        if (!ctx) return null;

        const bg = assigned ? "rgba(46,204,113,0.94)" : "rgba(220,53,69,0.94)";
        ctx.font = "bold 44px sans-serif";
        const content = String(text || "").trim() || "Unknown";
        const textW = ctx.measureText(content).width;
        const boxW = Math.max(220, Math.min(492, textW + 34));
        const boxX = (512 - boxW) / 2;

        drawRoundedRect(ctx, boxX, 20, boxW, 88, 28);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 44px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(content, 256, 64);

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

      const updateLabelSprite = (entry, labelText, assigned) => {
        if (entry.labelAssigned === assigned && entry.labelText === labelText && entry.labelSprite) return;
        if (entry.labelSprite) {
          if (entry.labelSprite.material?.map) entry.labelSprite.material.map.dispose();
          entry.labelSprite.material?.dispose();
          entry.stableRoot.remove(entry.labelSprite);
          entry.labelSprite = null;
        }

        const sprite = createLabelSprite(labelText, assigned);
        if (!sprite) return;
        entry.stableRoot.add(sprite);
        entry.labelSprite = sprite;
        entry.labelAssigned = assigned;
        entry.labelText = labelText;
      };

      /** Build gizmo meshes identical to the original single-marker design. */
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

      /**
       * Lazily create ArMarkerControls + markerRoot + stableRoot + gizmo for an ID.
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

        const gizmo = createGizmo();
        stableRoot.add(gizmo);

        markerEntriesRef.current.set(id, {
          markerRoot,
          stableRoot,
          missCount: 0,
          firstVisible: true,
          labelSprite: null,
          labelAssigned: null,
          labelText: "",
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

          const labelText = matchedMarker?.name?.trim() ? matchedMarker.name.trim() : `#${id}`;
          updateLabelSprite(entry, labelText, assigned);
          nextDetected.push({
            id,
            assigned,
            name: matchedMarker?.name || null,
          });
        }

        const detected = nextDetected;
        setDetectedMarkers(detected);
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

    initScene();

    return () => {
      active = false;
      clearARScene();
    };
  }, [appState, arReady, markers, showCapturedOnly]);

  return {
    arContainerRef,
    trackingMessage,
    detectedMarkers,
    clearARScene,
  };
};
