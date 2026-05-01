// ─── Application Screen States ───────────────────────────────────────────────
// The app is a simple state machine that moves between these four named screens.
export const APP_STATES = {
  MENU: "menu",
  CAPTURE: "capture",
  TRACKING: "tracking",
};

// ─── AR Tracking Tuning ───────────────────────────────────────────────────────

// Number of consecutive frames without a marker detection before it is
// considered "lost" and the 3D overlay is hidden.
export const TRACK_LOSS_THRESHOLD = 5;

// Lerp / slerp factor applied each animation frame to smooth the marker pose.
// 0 = never moves, 1 = immediately snaps to the raw detected pose.
export const TRACK_SMOOTHING = 0.45;

// The bundled AR.js runtime in this project supports matrix codes up to 4x4.
// 5x5 requires a newer ARToolkit/AR.js build than the current vendor bundle.
// Use the strongest supported 4x4 family for better robustness.
export const MATRIX_CODE_TYPE = "4x4_BCH_13_9_3";

// ─── AR Asset Paths ───────────────────────────────────────────────────────────
// Camera calibration data for ARToolkit, served locally from public/vendor
// to avoid network dependency on the upstream AR.js GitHub repository.
export const AR_CAMERA_PARAMS = "/vendor/data/camera_para.dat";
