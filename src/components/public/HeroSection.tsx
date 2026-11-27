"use client";

import type { RefObject } from "react";
import { ArrowDown, Compass } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { formatNumber } from "@/lib/utils/format";
import type { CommunitySettings, CommunityStatistics } from "@/types/community";

interface HeroSectionProps {
  heroRef: RefObject<HTMLElement | null>;
  settings: CommunitySettings;
  statistics: CommunityStatistics;
  isDemoMode: boolean;
}

export function HeroSection({
  heroRef,
  settings,
  statistics,
  isDemoMode,
}: HeroSectionProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());

  return (
    <section
      id="home"
      ref={heroRef}
      aria-labelledby="hero-heading"
      className="pointer-events-none relative flex min-h-[128vh] flex-col justify-between pt-28 pb-32"
    >
      <div className="mx-auto my-auto w-full max-w-7xl px-4 pt-8 pb-20 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="pointer-events-auto max-w-2xl"
        >
          <div className="inline-flex items-center gap-2.5 rounded-full border border-sky-400/25 bg-slate-950/65 px-3.5 py-1.5 text-xs font-medium tracking-widest text-sky-300 uppercase backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]" />
            <span>
              {settings.community_name} · {settings.tagline}
            </span>
          </div>

          <h1
            id="hero-heading"
            className="mt-6 font-display text-4xl leading-[1.08] font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            {settings.hero_heading}
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {settings.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            {settings.discord_url && (
              <a
                href={settings.discord_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full border border-sky-300/50 bg-sky-500/25 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_rgba(56,189,248,0.24)] backdrop-blur-md transition hover:border-sky-300 hover:bg-sky-400/35"
              >
                <PlatformIcon platform="discord" className="h-4 w-4 text-sky-200" />
                <span>Join Discord</span>
              </a>
            )}

            <a
              href="#about"
              className="inline-flex items-center gap-2 rounded-full border border-slate-600/60 bg-slate-950/65 px-6 py-3.5 text-sm font-medium text-slate-200 backdrop-blur-md transition hover:border-sky-400/45 hover:text-white"
            >
              <Compass className="h-4 w-4 text-sky-300" aria-hidden="true" />
              <span>Explore {settings.community_name}</span>
            </a>
          </div>

          {/* Subtle orbital telemetry strip */}
          <div className="mt-12 max-w-lg rounded-2xl glass-panel p-4 sm:p-5">
            {isDemoMode && (
              <p
                data-testid="demo-mode-badge"
                className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200"
              >
                Local Demonstration Mode · Sample Data
              </p>
            )}
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-slate-400">
                  {isDemoMode ? "Sample Members" : "Members"}
                </dt>
                <dd className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl">
                  {formatNumber(statistics.totalMembers)}
                </dd>
              </div>
              <div className="border-l border-sky-300/12 pl-4">
                <dt className="text-xs text-slate-400">Countries</dt>
                <dd className="mt-1 font-display text-xl font-semibold text-sky-300 sm:text-2xl">
                  {statistics.countriesRepresented}
                </dd>
              </div>
              <div className="border-l border-sky-300/12 pl-4">
                <dt className="text-xs text-slate-400">Continents</dt>
                <dd className="mt-1 font-display text-xl font-semibold text-slate-100 sm:text-2xl">
                  {statistics.continentsRepresented}
                </dd>
              </div>
            </dl>
          </div>
        </motion.div>
      </div>

      {/* Scroll departure cue */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="#about"
          className="pointer-events-auto inline-flex items-center gap-2 text-xs font-medium tracking-widest text-slate-400 uppercase transition hover:text-sky-300"
        >
          <ArrowDown className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
          <span>Scroll to journey into the starfield</span>
        </a>
      </div>
    </section>
  );
}
