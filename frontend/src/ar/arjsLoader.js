/**
 * arjsLoader.js
 *
 * Loads the AR.js 2.x runtime bundle into window.THREEx / window.ARjs at
 * runtime (the bundle cannot be imported as an ES module).
 *
 * Key challenges solved here:
 *  1. AR.js expects window.THREE to be a plain mutable object, not a frozen
 *     ES module namespace.  We copy all Three.js exports into a plain object.
 *  2. AR.js classes do not always extend THREE.EventDispatcher, which causes
 *     runtime errors in Three.js ≥ r125.  We patch the methods onto the
 *     relevant prototypes after loading.
 *  3. Multiple React hot-reloads can leave stale AR.js globals on window,
 *     causing silent detection failures.  We reset them before re-loading.
 */
import * as THREE from "three";

const ARJS_RUNTIME_URL = "/vendor/ar.js";

const EVENT_DISPATCHER_METHODS = [
  "addEventListener",
  "hasEventListener",
  "removeEventListener",
  "dispatchEvent",
];

// AR.js reads properties from window.THREE at runtime.  ES module namespaces
// are sealed (not extensible), so we copy everything into a plain object.
const createMutableThreeGlobal = () => {
  const mutableThree = {};

  for (const [key, value] of Object.entries(THREE)) {
    mutableThree[key] = value;
  }

  return mutableThree;
};

// Remove all global identifiers that AR.js may have set during a previous load
// so the next call starts with a clean slate.
const resetArjsGlobals = () => {
  delete window.THREEx;
  delete window.ARjs;
  delete window.artoolkit;
  delete window.ARController;
  delete window.ARCameraParam;
  delete window.Module;
};

// Graft THREE.EventDispatcher methods onto a prototype if they are missing.
// This is required for Three.js ≥ r125, which removed the implicit mixin.
const applyEventDispatcherMixin = (targetPrototype) => {
  if (!targetPrototype) {
    return;
  }

  for (const methodName of EVENT_DISPATCHER_METHODS) {
    if (typeof targetPrototype[methodName] !== "function") {
      targetPrototype[methodName] = THREE.EventDispatcher.prototype[methodName];
    }
  }
};

const patchArjsRuntime = () => {
  applyEventDispatcherMixin(window.THREEx?.ArBaseControls?.prototype);
  applyEventDispatcherMixin(window.THREEx?.ArToolkitContext?.prototype);
  applyEventDispatcherMixin(window.ARjs?.Context?.prototype);
};

export const loadARjs = async () => {
  if (typeof window === "undefined") {
    throw new Error("Window is not available.");
  }

  if (window.__arjsLoadingPromise) {
    return window.__arjsLoadingPromise;
  }

  window.__arjsLoadingPromise = new Promise((resolve, reject) => {
    window.THREE = createMutableThreeGlobal();

    if (window.THREEx?.ArToolkitSource) {
      patchArjsRuntime();
      resolve();
      return;
    }

    const existing = document.querySelector("script[data-arjs-runtime='true']");
    if (existing) {
      if (existing.getAttribute("src") !== ARJS_RUNTIME_URL) {
        existing.remove();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load AR.js runtime.")), { once: true });
        return;
      }
    }

    resetArjsGlobals();
    window.THREE = createMutableThreeGlobal();

    const script = document.createElement("script");
    script.src = ARJS_RUNTIME_URL;
    script.async = true;
    script.dataset.arjsRuntime = "true";
    script.onload = () => {
      if (!window.THREEx?.ArToolkitSource) {
        window.__arjsLoadingPromise = null;
        resetArjsGlobals();
        reject(new Error("AR.js loaded but THREEx.ArToolkitSource is unavailable."));
        return;
      }

      patchArjsRuntime();
      resolve();
    };
    script.onerror = () => {
      window.__arjsLoadingPromise = null;
      resetArjsGlobals();
      reject(new Error("Failed to load AR.js runtime."));
    };
    document.body.appendChild(script);
  });

  return window.__arjsLoadingPromise;
};
