"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Globe2,
  ListFilter,
  MapPin,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  OrbitGlobeCanvas,
  type GlobeZoomCommand,
} from "@/components/three/OrbitGlobeCanvas";
import { formatNumber } from "@/lib/utils/format";
import {
  CONTINENTS,
  formatCityCoordinates,
  inferContinentFromCountryCode,
} from "@/lib/utils/geography";
import type { CommunityLocation, GlobeTexturePreset } from "@/types/community";

interface OurWorldSectionProps {
  locations: CommunityLocation[];
  defaultTexture?: GlobeTexturePreset;
  defaultShowArcs?: boolean;
  selectedLocation: CommunityLocation | null;
  onSelectLocation: (location: CommunityLocation | null) => void;
}

const TEXTURE_LABELS: { id: GlobeTexturePreset; label: string }[] = [
  { id: "deep-ocean", label: "Deep Ocean" },
  { id: "night-lights", label: "Night Lights" },
  { id: "blue-marble", label: "Blue Marble" },
];

export function OurWorldSection({
  locations,
  defaultTexture = "deep-ocean",
  defaultShowArcs = true,
  selectedLocation,
  onSelectLocation,
}: OurWorldSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = Boolean(useReducedMotion());

  const [globeMounted, setGlobeMounted] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState<string>("All");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArcs, setShowArcs] = useState(defaultShowArcs);
  const [texturePreset, setTexturePreset] =
    useState<GlobeTexturePreset>(defaultTexture);
  const [zoomCommand, setZoomCommand] = useState<GlobeZoomCommand | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Lazy-mount the interactive Section 3 globe when scrolling near this section
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const raf = window.requestAnimationFrame(() => setGlobeMounted(true));
      return () => window.cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setGlobeMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "450px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const availableCountries = useMemo(() => {
    const filteredByContinent =
      selectedContinent === "All"
        ? locations
        : locations.filter(
            (loc) =>
              inferContinentFromCountryCode(loc.country_code, loc.continent) ===
              selectedContinent
          );
    return Array.from(new Set(filteredByContinent.map((l) => l.country))).sort(
      (a, b) => a.localeCompare(b, "en-US")
    );
  }, [locations, selectedContinent]);

  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return locations.filter((loc) => {
      const continent = inferContinentFromCountryCode(
        loc.country_code,
        loc.continent
      );
      if (selectedContinent !== "All" && continent !== selectedContinent) {
        return false;
      }
      if (selectedCountry !== "All" && loc.country !== selectedCountry) {
        return false;
      }
      if (
        q &&
        !loc.city.toLowerCase().includes(q) &&
        !loc.country.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [locations, selectedContinent, selectedCountry, searchQuery]);

  const filteredMemberTotal = useMemo(
    () => filteredLocations.reduce((acc, loc) => acc + loc.member_count, 0),
    [filteredLocations]
  );

  const handleContinentChange = (continent: string) => {
    setSelectedContinent(continent);
    setSelectedCountry("All");
  };

  return (
    <section
      id="world"
      ref={sectionRef}
      aria-labelledby="world-heading"
      className="relative py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-sky-400 uppercase">
              Our World
            </p>
            <h2
              id="world-heading"
              className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Explore where our community calls home
            </h2>
            <p className="mt-3 text-base text-slate-300">
              Rotate and zoom the globe, inspect regional chapters, or browse the
              accessible city directory below. All markers represent aggregated
              city-level community hubs.
            </p>
          </div>

          {/* Globe Visual Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArcs((prev) => !prev)}
              aria-pressed={showArcs}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                showArcs
                  ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
              }`}
            >
              <Network className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Connection Arcs</span>
            </button>

            <div
              role="group"
              aria-label="Earth texture style"
              className="inline-flex rounded-full border border-slate-700/80 bg-slate-950/70 p-0.5"
            >
              {TEXTURE_LABELS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setTexturePreset(preset.id)}
                  aria-pressed={texturePreset === preset.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    texturePreset === preset.id
                      ? "bg-sky-500/25 text-sky-100"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Geographic Filters */}
        <div className="mt-8 glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="group"
              aria-label="Filter locations by continent"
              className="flex flex-wrap items-center gap-1.5"
            >
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <ListFilter className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                Continent:
              </span>
              {["All", ...CONTINENTS].map((continent) => (
                <button
                  key={continent}
                  type="button"
                  onClick={() => handleContinentChange(continent)}
                  aria-pressed={selectedContinent === continent}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selectedContinent === continent
                      ? "border border-sky-400/50 bg-sky-500/20 text-sky-100"
                      : "border border-transparent bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  {continent}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <label htmlFor="country-filter" className="sr-only">
                  Filter by country
                </label>
                <select
                  id="country-filter"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/85 px-3.5 py-2 text-xs text-slate-200 sm:w-44"
                >
                  <option value="All">All Countries ({availableCountries.length})</option>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label htmlFor="location-search" className="sr-only">
                  Search city or country
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="location-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city or country..."
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/85 py-2 pr-3.5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 sm:w-52"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Globe + Location Inspector */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="glass-panel relative flex min-h-[400px] items-center justify-center overflow-hidden rounded-3xl sm:min-h-[520px] lg:col-span-8">
            {globeMounted ? (
              <OrbitGlobeCanvas
                locations={filteredLocations}
                texturePreset={texturePreset}
                showArcs={showArcs}
                interactive={true}
                enableZoom={true}
                autoRotate={true}
                autoRotateSpeed={0.28}
                selectedLocation={selectedLocation}
                onSelectLocation={(loc) => onSelectLocation(loc)}
                reducedMotion={prefersReducedMotion}
                initialAltitude={2.15}
                zoomCommand={zoomCommand}
                resetTrigger={resetTrigger}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Globe2 className="h-8 w-8 animate-pulse text-sky-400" aria-hidden="true" />
                <span className="text-xs tracking-wider uppercase">
                  Initializing 3D Earth...
                </span>
              </div>
            )}

            {/* Accessible Camera Controls Overlay */}
            <div
              role="group"
              aria-label="Globe camera controls"
              className="absolute right-4 bottom-4 z-10 flex items-center gap-1.5 rounded-full border border-sky-300/20 bg-slate-950/85 p-1.5 backdrop-blur-md"
            >
              <button
                type="button"
                aria-label="Zoom in globe"
                onClick={() =>
                  setZoomCommand((prev) => ({
                    direction: 1,
                    seq: (prev?.seq ?? 0) + 1,
                  }))
                }
                className="rounded-full p-2 text-slate-200 transition hover:bg-sky-500/20 hover:text-sky-200"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Zoom out globe"
                onClick={() =>
                  setZoomCommand((prev) => ({
                    direction: -1,
                    seq: (prev?.seq ?? 0) + 1,
                  }))
                }
                className="rounded-full p-2 text-slate-200 transition hover:bg-sky-500/20 hover:text-sky-200"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Reset globe camera"
                onClick={() => {
                  onSelectLocation(null);
                  setResetTrigger((c) => c + 1);
                }}
                className="rounded-full p-2 text-slate-200 transition hover:bg-sky-500/20 hover:text-sky-200"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="pointer-events-none absolute top-4 left-4 rounded-full border border-sky-400/20 bg-slate-950/75 px-3 py-1 text-xs text-slate-300 backdrop-blur-md">
              Showing{" "}
              <span className="font-semibold text-sky-300">
                {filteredLocations.length}
              </span>{" "}
              {filteredLocations.length === 1 ? "location" : "locations"} (
              {formatNumber(filteredMemberTotal)} members)
            </div>
          </div>

          {/* Selected Location Inspector Panel */}
          <aside
            aria-label="Selected community location details"
            className="glass-panel flex flex-col justify-between rounded-3xl p-6 lg:col-span-4"
          >
            {selectedLocation ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: selectedLocation.marker_color || "#38bdf8",
                      }}
                    />
                    {inferContinentFromCountryCode(
                      selectedLocation.country_code,
                      selectedLocation.continent
                    )}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {selectedLocation.country_code}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-2xl font-semibold text-white">
                  {selectedLocation.city}
                </h3>
                <p className="text-sm font-medium text-slate-300">
                  {selectedLocation.country}
                </p>

                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-sky-300/15 bg-slate-950/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Community Members</p>
                    <p className="font-display text-xl font-semibold text-white">
                      {formatNumber(selectedLocation.member_count)}
                    </p>
                  </div>
                </div>

                {selectedLocation.description && (
                  <p className="mt-5 text-sm leading-relaxed text-slate-300">
                    {selectedLocation.description}
                  </p>
                )}

                <p className="mt-5 flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span>
                    Approximate city hub:{" "}
                    {formatCityCoordinates(
                      selectedLocation.latitude,
                      selectedLocation.longitude
                    )}
                  </span>
                </p>
              </div>
            ) : (
              <div className="my-auto py-8 text-center">
                <Globe2
                  className="mx-auto h-10 w-10 text-sky-400/70"
                  aria-hidden="true"
                />
                <h3 className="mt-3 font-display text-lg font-medium text-white">
                  Select a Community Hub
                </h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Click any glowing marker on the Earth or choose a city from the
                  accessible directory below to inspect its details.
                </p>
              </div>
            )}

            <div className="mt-6 border-t border-sky-300/10 pt-4 text-xs text-slate-400">
              Locations reflect voluntary city or country-level community
              aggregates—never individual addresses.
            </div>
          </aside>
        </div>

        {/* Accessible Alternative Location List */}
        <div className="mt-8 glass-panel rounded-3xl p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-white">
                Accessible Global Hub Directory
              </h3>
              <p className="text-xs text-slate-400">
                Select any location row to focus it on the globe and inspect its
                regional chapter.
              </p>
            </div>
          </div>

          {filteredLocations.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-sm text-slate-400">
              No community locations match the selected geographic filters.
            </p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLocations.map((loc) => {
                const isSelected = selectedLocation?.id === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => onSelectLocation(loc)}
                    aria-pressed={isSelected}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-sky-400/60 bg-sky-500/15 shadow-[0_0_24px_rgba(56,189,248,0.12)]"
                        : "border-slate-800/90 bg-slate-950/55 hover:border-sky-400/35 hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: loc.marker_color || "#38bdf8" }}
                        />
                        <span className="truncate text-sm font-medium text-white">
                          {loc.city}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {loc.country} ·{" "}
                        {inferContinentFromCountryCode(
                          loc.country_code,
                          loc.continent
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-200">
                      {formatNumber(loc.member_count)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
