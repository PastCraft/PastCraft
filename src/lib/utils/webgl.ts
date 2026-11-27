import { useSyncExternalStore } from "react";

let cachedWebGLResult: boolean | null = null;

export function detectWebGLSupport(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  if (cachedWebGLResult !== null) {
    return cachedWebGLResult;
  }

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    cachedWebGLResult = Boolean(gl);
    return cachedWebGLResult;
  } catch {
    cachedWebGLResult = false;
    return false;
  }
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth < 768;
}

const noopSubscribe = () => () => {};

/**
 * React 19-safe hydration hook for detecting client WebGL availability without
 * synchronous setState inside useEffect.
 */
export function useWebGLSupport(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => detectWebGLSupport(),
    () => true
  );
}

function subscribeToViewportResize(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback, { passive: true });
  return () => window.removeEventListener("resize", callback);
}

export function useIsMobileViewport(): boolean {
  return useSyncExternalStore(
    subscribeToViewportResize,
    () => isMobileViewport(),
    () => false
  );
}
