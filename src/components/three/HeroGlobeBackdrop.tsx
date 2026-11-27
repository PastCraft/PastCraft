"use client";

import { useState, type RefObject } from "react";
import { MapPin, X } from "lucide-react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { formatNumber } from "@/lib/utils/format";
import { useIsMobileViewport } from "@/lib/utils/webgl";
import { OrbitGlobeCanvas } from "./OrbitGlobeCanvas";
import type { CommunityLocation, GlobeTexturePreset } from "@/types/community";

interface HeroGlobeBackdropProps {
  heroRef: RefObject<HTMLElement | null>;
  locations: CommunityLocation[];
  texturePreset?: GlobeTexturePreset;
  showArcs?: boolean;
  onInspectLocation?: (location: CommunityLocation) => void;
}

/**
 * Layer 3 — Transparent React Globe.gl backdrop connected to Hero scroll progress.
 * - Initial load & Hero intro: Full rotating Earth with cyan atmosphere.
 * - Early scrolling: Earth gradually moves, scales down slightly, and fades.
 * - Transition: Earth disappears smoothly while persistent starfield remains.
 * - Scrolling back up: Smoothly restores the Earth.
 * - On desktop, the circular Earth sphere itself supports marker hover & drag-to-spin
 *   (with wheel zoom disabled so scrolling always glides smoothly through the page).
 */
export function HeroGlobeBackdrop({
  heroRef,
  locations,
  texturePreset = "deep-ocean",
  showArcs = true,
  onInspectLocation,
}: HeroGlobeBackdropProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const isMobile = useIsMobileViewport();
  const [isFullyHidden, setIsFullyHidden] = useState(false);
  const [isInteractiveZone, setIsInteractiveZone] = useState(true);
  const [hoveredOrClickedHub, setHoveredOrClickedHub] =
    useState<CommunityLocation | null>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    restDelta: 0.001,
  });

  const opacity = useTransform(
    smoothProgress,
    [0, 0.24, 0.72, 0.96],
    [1, 0.94, 0.22, 0]
  );
  const scale = useTransform(
    smoothProgress,
    [0, 0.96],
    prefersReducedMotion ? [1, 1] : [1, 0.84]
  );
  const translateY = useTransform(
    smoothProgress,
    [0, 0.96],
    prefersReducedMotion ? [0, 0] : [0, -96]
  );

  useMotionValueEvent(opacity, "change", (latest) => {
    const shouldHide = latest <= 0.015;
    if (shouldHide !== isFullyHidden) {
      setIsFullyHidden(shouldHide);
    }
    const shouldInteract = latest > 0.35;
    if (shouldInteract !== isInteractiveZone) {
      setIsInteractiveZone(shouldInteract);
    }
  });

  const handleHeroMarkerClick = (loc: CommunityLocation) => {
    setHoveredOrClickedHub(loc);
    onInspectLocation?.(loc);
  };

  return (
    <motion.div
      data-testid="hero-globe-backdrop"
      style={{
        opacity,
        scale,
        y: translateY,
      }}
      className={`fixed inset-0 z-[1] flex items-center justify-center pointer-events-none select-none ${
        isFullyHidden ? "invisible" : "visible"
      }`}
    >
      <div className="relative flex h-[min(92vw,820px)] w-[min(92vw,820px)] items-center justify-center translate-y-8 sm:translate-y-4 lg:translate-x-[16%] lg:translate-y-2">
        {/* Soft atmospheric halo behind Earth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[14%] rounded-full blur-3xl opacity-45"
          style={{
            background:
              "radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, rgba(37, 99, 235, 0.1) 55%, transparent 75%)",
          }}
        />

        {/* Circular Earth interactive hit region on desktop (never blocks wheel scroll or hero CTA text) */}
        <div
          className={`relative h-[78%] w-[78%] overflow-hidden rounded-full ${
            !isMobile && isInteractiveZone
              ? "pointer-events-auto cursor-grab active:cursor-grabbing"
              : "pointer-events-none"
          }`}
        >
          <OrbitGlobeCanvas
            locations={locations}
            texturePreset={texturePreset}
            showArcs={showArcs}
            interactive={!isMobile && isInteractiveZone}
            enableZoom={false}
            autoRotate={true}
            autoRotateSpeed={0.34}
            onSelectLocation={handleHeroMarkerClick}
            paused={isFullyHidden}
            reducedMotion={prefersReducedMotion}
            initialAltitude={2.2}
          />
        </div>

        {/* Compact hub preview badge when visitor clicks a marker on the Hero globe */}
        {hoveredOrClickedHub && isInteractiveZone && !isMobile && (
          <div className="pointer-events-auto absolute bottom-12 right-6 z-20 flex items-center gap-3 rounded-2xl border border-sky-400/35 bg-slate-950/90 px-4 py-2.5 text-xs text-slate-100 shadow-[0_12px_32px_rgba(2,5,14,0.75)] backdrop-blur-xl">
            <MapPin className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
            <div>
              <p className="font-semibold text-white">
                {hoveredOrClickedHub.city}, {hoveredOrClickedHub.country}
              </p>
              <p className="text-[11px] text-sky-300">
                {formatNumber(hoveredOrClickedHub.member_count)} members ·{" "}
                <a href="#world" className="underline hover:text-white">
                  Inspect in Our World
                </a>
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss hub preview"
              onClick={() => setHoveredOrClickedHub(null)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
