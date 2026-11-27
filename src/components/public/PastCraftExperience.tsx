"use client";

import { useRef, useState } from "react";
import { StarfieldBackground } from "@/components/three/StarfieldBackground";
import { HeroGlobeBackdrop } from "@/components/three/HeroGlobeBackdrop";
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { AboutSection } from "./AboutSection";
import { OurWorldSection } from "./OurWorldSection";
import { HistorySection } from "./HistorySection";
import { MediaSection } from "./MediaSection";
import { SocialSection } from "./SocialSection";
import { Footer } from "./Footer";
import type {
  CommunityLocation,
  DiscordWidgetSummary,
  PublicCommunityPayload,
  YouTubeFeedResult,
} from "@/types/community";

interface PastCraftExperienceProps {
  community: PublicCommunityPayload;
  youtubeFeed: YouTubeFeedResult;
  discordWidget?: DiscordWidgetSummary;
}

export function PastCraftExperience({
  community,
  youtubeFeed,
  discordWidget,
}: PastCraftExperienceProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const { settings, statistics, locations, history, socialLinks, dataSource } =
    community;
  const isDemoMode = dataSource === "seed";

  const [selectedLocation, setSelectedLocation] =
    useState<CommunityLocation | null>(locations[0] ?? null);

  return (
    <div className="relative min-h-screen">
      {/* Skip to content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-sky-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to main content
      </a>

      {/* Layer 1 & Layer 2: Persistent Space & Starfield (never disappears) */}
      <StarfieldBackground density={settings.star_density} />

      {/* Layer 3: Transparent Scroll-Linked Hero Globe */}
      <HeroGlobeBackdrop
        heroRef={heroRef}
        locations={locations}
        texturePreset={settings.globe_texture}
        showArcs={settings.show_arcs}
        onInspectLocation={(loc) => setSelectedLocation(loc)}
      />

      {/* Foreground Content Layer */}
      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col">
        <div className="pointer-events-auto">
          <Navbar settings={settings} />
        </div>

        <main id="main-content" className="flex-1">
          <HeroSection
            heroRef={heroRef}
            settings={settings}
            statistics={statistics}
            isDemoMode={isDemoMode}
          />
          <div className="pointer-events-auto">
            <AboutSection
              settings={settings}
              statistics={statistics}
              isDemoMode={isDemoMode}
            />
            <OurWorldSection
              locations={locations}
              defaultTexture={settings.globe_texture}
              defaultShowArcs={settings.show_arcs}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
            />
            <HistorySection events={history} />
            <MediaSection feed={youtubeFeed} socialLinks={socialLinks} />
            <SocialSection
              settings={settings}
              socialLinks={socialLinks}
              discordWidget={discordWidget}
            />
          </div>
        </main>

        <div className="pointer-events-auto">
          <Footer
            settings={settings}
            socialLinks={socialLinks}
            isDemoMode={isDemoMode}
          />
        </div>
      </div>
    </div>
  );
}
