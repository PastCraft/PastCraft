"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";
import { formatNumber } from "@/lib/utils/format";
import { buildConnectionArcs } from "@/lib/utils/geography";
import {
  useIsMobileViewport,
  useWebGLSupport,
} from "@/lib/utils/webgl";
import type {
  CommunityLocation,
  GlobeArc,
  GlobeTexturePreset,
} from "@/types/community";

const GlobeClient = dynamic(() => import("./GlobeClient"), {
  ssr: false,
});

const TEXTURE_URLS: Record<
  GlobeTexturePreset,
  { globeImage: string; bumpImage: string; atmosphereColor: string }
> = {
  "deep-ocean": {
    globeImage: "/textures/earth-blue-marble.jpg",
    bumpImage: "/textures/earth-topology.png",
    atmosphereColor: "#38bdf8",
  },
  "night-lights": {
    globeImage: "/textures/earth-night.jpg",
    bumpImage: "/textures/earth-topology.png",
    atmosphereColor: "#60a5fa",
  },
  "blue-marble": {
    globeImage: "/textures/earth-blue-marble.jpg",
    bumpImage: "/textures/earth-topology.png",
    atmosphereColor: "#7dd3fc",
  },
};

export interface GlobeZoomCommand {
  direction: 1 | -1;
  seq: number;
}

export interface OrbitGlobeCanvasProps {
  locations: CommunityLocation[];
  texturePreset?: GlobeTexturePreset;
  showArcs?: boolean;
  interactive?: boolean;
  enableZoom?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  selectedLocation?: CommunityLocation | null;
  onSelectLocation?: (location: CommunityLocation) => void;
  paused?: boolean;
  reducedMotion?: boolean;
  width?: number;
  height?: number;
  initialAltitude?: number;
  zoomCommand?: GlobeZoomCommand | null;
  resetTrigger?: number;
}

export function OrbitGlobeCanvas({
  locations,
  texturePreset = "deep-ocean",
  showArcs = true,
  interactive = true,
  enableZoom = true,
  autoRotate = true,
  autoRotateSpeed = 0.38,
  selectedLocation = null,
  onSelectLocation,
  paused = false,
  reducedMotion = false,
  width,
  height,
  initialAltitude = 2.25,
  zoomCommand = null,
  resetTrigger = 0,
}: OrbitGlobeCanvasProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const webglSupported = useWebGLSupport();
  const isMobile = useIsMobileViewport();
  const [measuredDims, setMeasuredDims] = useState({
    w: width ?? 760,
    h: height ?? 760,
  });
  const [globeReady, setGlobeReady] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);

  const effectiveWidth = width ?? measuredDims.w;
  const effectiveHeight = height ?? measuredDims.h;
  const isEffectivelyPaused = paused || isPageHidden;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const syncVisibility = () => {
      setIsPageHidden(document.visibilityState === "hidden");
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (width && height) {
      return;
    }

    const el = wrapperRef.current;
    if (!el) return;

    const updateDims = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMeasuredDims({
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        });
      }
    };

    const rafId = window.requestAnimationFrame(updateDims);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateDims());
      observer.observe(el);
      return () => {
        window.cancelAnimationFrame(rafId);
        observer.disconnect();
      };
    }

    window.addEventListener("resize", updateDims, { passive: true });
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateDims);
    };
  }, [width, height]);

  const globeMaterial = useMemo(() => {
    const mat = new THREE.MeshPhongMaterial();
    if (texturePreset === "deep-ocean") {
      mat.color = new THREE.Color("#8ec5ff");
      mat.emissive = new THREE.Color("#06152d");
      mat.emissiveIntensity = 0.55;
      mat.shininess = 18;
      mat.specular = new THREE.Color("#1d4ed8");
    } else if (texturePreset === "night-lights") {
      mat.color = new THREE.Color("#cbd5e1");
      mat.emissive = new THREE.Color("#040b1a");
      mat.emissiveIntensity = 0.35;
      mat.shininess = 10;
    } else {
      mat.color = new THREE.Color("#e2e8f0");
      mat.emissive = new THREE.Color("#040d21");
      mat.emissiveIntensity = 0.25;
      mat.shininess = 14;
    }
    mat.bumpScale = 5;
    return mat;
  }, [texturePreset]);

  useEffect(() => {
    return () => {
      globeMaterial.dispose();
    };
  }, [globeMaterial]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady) return;

    const controls =
      typeof globe.controls === "function" ? globe.controls() : null;
    if (controls) {
      controls.enableZoom = interactive && enableZoom;
      controls.enablePan = false;
      controls.enableRotate = interactive;
      controls.minDistance = 155;
      controls.maxDistance = 420;
      controls.autoRotate = Boolean(
        autoRotate && !reducedMotion && !isEffectivelyPaused && !selectedLocation
      );
      controls.autoRotateSpeed = autoRotateSpeed;
    }

    if (isEffectivelyPaused) {
      globe.pauseAnimation?.();
    } else {
      globe.resumeAnimation?.();
    }
  }, [
    globeReady,
    interactive,
    enableZoom,
    autoRotate,
    autoRotateSpeed,
    reducedMotion,
    isEffectivelyPaused,
    selectedLocation,
  ]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady || typeof globe.pointOfView !== "function") return;
    const altitude = isMobile ? initialAltitude + 0.35 : initialAltitude;
    globe.pointOfView({ lat: 22, lng: 12, altitude }, 0);
  }, [globeReady, initialAltitude, isMobile]);

  useEffect(() => {
    const globe = globeRef.current;
    if (
      !globe ||
      !globeReady ||
      !selectedLocation ||
      typeof globe.pointOfView !== "function"
    ) {
      return;
    }

    globe.pointOfView(
      {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        altitude: isMobile ? 1.85 : 1.55,
      },
      reducedMotion ? 0 : 900
    );
  }, [globeReady, selectedLocation, isMobile, reducedMotion]);

  useEffect(() => {
    const globe = globeRef.current;
    if (
      !globe ||
      !globeReady ||
      !zoomCommand ||
      typeof globe.pointOfView !== "function"
    ) {
      return;
    }
    const currentPov = globe.pointOfView();
    const nextAlt = Math.min(
      3.4,
      Math.max(1.25, (currentPov?.altitude ?? 2.2) - zoomCommand.direction * 0.3)
    );
    globe.pointOfView(
      {
        lat: currentPov?.lat ?? 20,
        lng: currentPov?.lng ?? 10,
        altitude: nextAlt,
      },
      reducedMotion ? 0 : 400
    );
  }, [zoomCommand, globeReady, reducedMotion]);

  useEffect(() => {
    const globe = globeRef.current;
    if (
      !globe ||
      !globeReady ||
      resetTrigger === 0 ||
      typeof globe.pointOfView !== "function"
    ) {
      return;
    }
    globe.pointOfView(
      {
        lat: 22,
        lng: 12,
        altitude: isMobile ? initialAltitude + 0.35 : initialAltitude,
      },
      reducedMotion ? 0 : 750
    );
  }, [resetTrigger, globeReady, initialAltitude, isMobile, reducedMotion]);

  const arcs = useMemo<GlobeArc[]>(() => {
    if (!showArcs) return [];
    const allArcs = buildConnectionArcs(locations);
    return isMobile ? allArcs.slice(0, 6) : allArcs;
  }, [locations, showArcs, isMobile]);

  const ringsData = useMemo(() => {
    if (reducedMotion || isEffectivelyPaused) return [];
    const subset = isMobile ? locations.slice(0, 6) : locations.slice(0, 14);
    return subset.map((loc) => ({
      lat: loc.latitude,
      lng: loc.longitude,
      maxR: Math.min(4.8, 1.8 + Math.sqrt(loc.member_count) * 0.16),
      propagationSpeed: 1.1,
      repeatPeriod: 1900,
      color: loc.marker_color || "#38bdf8",
    }));
  }, [locations, reducedMotion, isEffectivelyPaused, isMobile]);

  const handlePointClick = useCallback(
    (point: object) => {
      if (!onSelectLocation) return;
      onSelectLocation(point as CommunityLocation);
    },
    [onSelectLocation]
  );

  const formatPointTooltip = useCallback((point: object) => {
    const loc = point as CommunityLocation;
    const safeCity = loc.city.replace(/[<>&"']/g, "");
    const safeCountry = loc.country.replace(/[<>&"']/g, "");
    const count = Number(loc.member_count) || 0;
    return `
      <div style="
        background: rgba(5, 11, 26, 0.92);
        border: 1px solid rgba(56, 189, 248, 0.38);
        border-radius: 10px;
        padding: 10px 14px;
        color: #f1f5f9;
        font-family: ui-sans-serif, system-ui, sans-serif;
        box-shadow: 0 12px 28px rgba(0,0,0,0.65);
        min-width: 150px;
      ">
        <div style="font-weight: 600; font-size: 13px; color: #f8fafc;">${safeCity}, ${safeCountry}</div>
        <div style="font-size: 12px; color: #7dd3fc; margin-top: 3px;">${formatNumber(count)} community ${
          count === 1 ? "member" : "members"
        }</div>
      </div>
    `;
  }, []);

  const textureConfig = TEXTURE_URLS[texturePreset] ?? TEXTURE_URLS["deep-ocean"];

  if (!webglSupported) {
    return (
      <div
        data-testid="globe-webgl-fallback"
        className="flex h-full w-full items-center justify-center p-6"
      >
        <div className="relative flex aspect-square w-full max-w-md flex-col items-center justify-center rounded-full border border-sky-400/25 bg-radial from-sky-950/60 via-slate-950/80 to-transparent p-8 text-center shadow-[0_0_90px_rgba(56,189,248,0.12)]">
          <p className="text-xs font-medium tracking-[0.2em] text-sky-300 uppercase">
            Global Projection
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {locations.length} Active Global Hubs
          </p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
            3D WebGL rendering is unavailable on this device. Explore the full
            accessible location directory below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      data-testid="orbit-globe-container"
      className="relative flex h-full w-full items-center justify-center"
    >
      <GlobeClient
        globeRef={globeRef}
        width={effectiveWidth}
        height={effectiveHeight}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={textureConfig.globeImage}
        bumpImageUrl={textureConfig.bumpImage}
        globeMaterial={globeMaterial}
        showAtmosphere={true}
        atmosphereColor={textureConfig.atmosphereColor}
        atmosphereAltitude={0.18}
        animateIn={!reducedMotion}
        onGlobeReady={() => setGlobeReady(true)}
        pointsData={locations}
        pointLat="latitude"
        pointLng="longitude"
        pointColor={(d: object) =>
          (d as CommunityLocation).id === selectedLocation?.id
            ? "#ffffff"
            : (d as CommunityLocation).marker_color || "#38bdf8"
        }
        pointAltitude={(d: object) => {
          const loc = d as CommunityLocation;
          const base = Math.min(0.08, 0.015 + Math.sqrt(loc.member_count) * 0.0032);
          return loc.id === selectedLocation?.id ? base + 0.035 : base;
        }}
        pointRadius={(d: object) => {
          const loc = d as CommunityLocation;
          const base = Math.min(0.72, 0.26 + Math.sqrt(loc.member_count) * 0.025);
          return loc.id === selectedLocation?.id ? base * 1.35 : base;
        }}
        pointResolution={isMobile ? 8 : 14}
        pointLabel={interactive ? formatPointTooltip : undefined}
        onPointClick={interactive ? handlePointClick : undefined}
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d: object) => {
          const hex = (d as { color: string }).color || "#38bdf8";
          return (t: number) => `${hex}${Math.round((1 - t) * 160)
            .toString(16)
            .padStart(2, "0")}`;
        }}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcStroke={0.38}
        arcDashLength={0.45}
        arcDashGap={0.85}
        arcDashInitialGap={() => Math.random()}
        arcDashAnimateTime={reducedMotion || isEffectivelyPaused ? 0 : 3200}
        labelsData={interactive && !isMobile ? locations.slice(0, 18) : []}
        labelLat="latitude"
        labelLng="longitude"
        labelText={(d: object) => (d as CommunityLocation).city}
        labelSize={0.95}
        labelDotRadius={0.18}
        labelColor={() => "rgba(226, 232, 240, 0.85)"}
        labelResolution={2}
        labelAltitude={0.018}
        onLabelClick={interactive ? handlePointClick : undefined}
      />
    </div>
  );
}
