/**
 * arHelpers.js — Math utilities for the AR tracking loop.
 *
 * All functions are pure (no side effects) and work on Three.js
 * value types (Vector3, Quaternion) or plain numbers.
 */
import * as THREE from "three";

/** Clamp a number to the inclusive [min, max] range. */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** In-place linear interpolation of a Vector3 toward source by alpha. */
export const lerpVector = (target, source, alpha) => {
  target.lerp(source, alpha);
  return target;
};

/** In-place spherical linear interpolation of a Quaternion toward source by alpha. */
export const slerpQuaternion = (target, source, alpha) => {
  target.slerp(source, alpha);
  return target;
};

/**
 * Project a world-space Vector3 through the camera's projection matrix
 * and return screen-pixel coordinates plus visibility flags.
 */
export const computeScreenPosition = (position, camera, width, height) => {
  const projected = position.clone().project(camera);
  const isInFront = projected.z > -1 && projected.z < 1;
  const screenX = ((projected.x + 1) / 2) * width;
  const screenY = ((1 - projected.y) / 2) * height;
  const onScreen = isInFront && projected.x >= -1 && projected.x <= 1 && projected.y >= -1 && projected.y <= 1;
  return {
    screenX,
    screenY,
    normalizedX: projected.x,
    normalizedY: projected.y,
    depth: projected.z,
    onScreen,
  };
};

/** Clamp screen-pixel coordinates to the viewport with an optional edge padding. */
export const clampScreenPosition = (x, y, width, height, padding = 28) => ({
  x: clamp(x, padding, width - padding),
  y: clamp(y, padding, height - padding),
});

/**
 * Cast a ray from the camera centre through the viewport origin (NDC 0,0),
 * intersect it with the marker's world plane, and return the intersection
 * point in marker-local coordinates — suitable for anchoring new issue points.
 *
 * Returns null if the ray is parallel to the plane or the marker is behind
 * the camera.
 */
export const worldPointToMarkerPlane = (point, markerRoot, camera) => {
  const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(markerRoot.quaternion);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, markerRoot.getWorldPosition(new THREE.Vector3()));
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersection = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(plane, intersection);
  return hit ? markerRoot.worldToLocal(intersection.clone()) : null;
};
