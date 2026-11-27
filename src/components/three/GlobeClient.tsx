"use client";

import type { RefObject } from "react";
import Globe, { type GlobeMethods, type GlobeProps } from "react-globe.gl";

export interface GlobeClientProps extends GlobeProps {
  globeRef?: RefObject<GlobeMethods | undefined>;
}

/**
 * Thin client wrapper so `next/dynamic` forwards `globeRef` reliably as a regular prop
 * instead of intercepting React's special `ref` prop.
 */
export default function GlobeClient({ globeRef, ...props }: GlobeClientProps) {
  return <Globe ref={globeRef} {...props} />;
}
