import { useState, useEffect } from "react";
import { loadARjs } from "../arjsLoader";

/**
 * Loads the AR.js runtime script once on mount.
 *
 * The runtime must be available as a global (window.THREEx) before any
 * ArToolkitSource / ArToolkitContext / ArMarkerControls instances can be
 * created. Components that need AR should wait for arReady === true.
 */
export const useAREngine = () => {
  const [arReady, setArReady] = useState(false);
  const [arError, setArError] = useState(null);

  useEffect(() => {
    loadARjs()
      .then(() => setArReady(true))
      .catch((error) => setArError(error?.message ?? String(error)));
  }, []);

  return { arReady, arError };
};
