"use client";

import { useEffect, useState } from "react";
import { Menu, Orbit, X } from "lucide-react";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import type { CommunitySettings } from "@/types/community";

interface NavbarProps {
  settings: CommunitySettings;
}

const NAV_ITEMS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Our World", href: "#world" },
  { label: "History", href: "#history" },
  { label: "Media", href: "#media" },
  { label: "Join Community", href: "#connect" },
];

export function Navbar({ settings }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "border-b border-sky-300/12 bg-slate-950/78 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#home" className="group flex items-center gap-3 text-slate-100">
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logo_url}
              alt={`${settings.community_name} logo`}
              className="h-9 w-9 rounded-full border border-sky-400/30 object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/35 bg-sky-500/10 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.2)] transition-transform duration-300 group-hover:scale-105">
              <Orbit className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <span className="font-display text-base font-semibold tracking-wide text-slate-100 sm:text-lg">
            {settings.community_name}
          </span>
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-6 lg:gap-7 md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-sky-300"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {settings.discord_url && (
            <a
              href={settings.discord_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.16)] transition hover:border-sky-300/70 hover:bg-sky-400/25"
            >
              <PlatformIcon platform="discord" className="h-4 w-4 text-sky-300" />
              <span>Join Discord</span>
            </a>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-lg border border-sky-300/20 bg-slate-900/70 p-2 text-slate-200 hover:border-sky-400/40 hover:text-sky-200 md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
          className="border-b border-sky-300/15 bg-slate-950/95 px-4 pt-2 pb-6 backdrop-blur-2xl md:hidden"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base font-medium text-slate-200 hover:bg-sky-500/10 hover:text-sky-300"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {settings.discord_url && (
            <div className="mt-4 border-t border-slate-800 pt-3">
              <a
                href={settings.discord_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-sky-400/45 bg-sky-500/20 px-4 py-2.5 text-sm font-semibold text-sky-100"
              >
                <PlatformIcon platform="discord" className="h-4 w-4 text-sky-300" />
                <span>Join Discord Community</span>
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
