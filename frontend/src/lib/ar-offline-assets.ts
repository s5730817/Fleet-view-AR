import { getCachedValue, setCachedValue } from "@/lib/offline-store";

export const AR_RUNTIME_URL = "/vendor/ar.js";
export const AR_CAMERA_PARAMS_URL = "/vendor/data/camera_para.dat";

const AR_RUNTIME_SOURCE_KEY = "shared:ar-runtime-source";
const AR_CAMERA_PARAMS_KEY = "shared:ar-camera-params";

let cachedCameraParamsObjectUrl: string | null = null;

const cacheAssetText = async (url: string, cacheKey: string) => {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  const text = await response.text();
  await setCachedValue(cacheKey, text);
  return text;
};

export const warmOfflineArAssets = async () => {
  await Promise.allSettled([
    cacheAssetText(AR_RUNTIME_URL, AR_RUNTIME_SOURCE_KEY),
    cacheAssetText(AR_CAMERA_PARAMS_URL, AR_CAMERA_PARAMS_KEY),
  ]);
};

export const getOfflineArRuntimeSource = async () => {
  return getCachedValue<string>(AR_RUNTIME_SOURCE_KEY);
};

export const getARCameraParamsUrl = async () => {
  if (window.navigator.onLine) {
    return AR_CAMERA_PARAMS_URL;
  }

  if (cachedCameraParamsObjectUrl) {
    return cachedCameraParamsObjectUrl;
  }

  const cachedCameraParams = await getCachedValue<string>(AR_CAMERA_PARAMS_KEY);

  if (!cachedCameraParams) {
    return AR_CAMERA_PARAMS_URL;
  }

  cachedCameraParamsObjectUrl = URL.createObjectURL(
    new Blob([cachedCameraParams], { type: "text/plain" })
  );

  return cachedCameraParamsObjectUrl;
};