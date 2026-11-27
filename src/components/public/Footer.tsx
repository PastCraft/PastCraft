import { Orbit } from "lucide-react";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import type { CommunitySettings, SocialLink } from "@/types/community";

interface FooterProps {
  settings: CommunitySettings;
  socialLinks: SocialLink[];
  isDemoMode: boolean;
}

export function Footer({ settings, socialLinks, isDemoMode }: FooterProps) {
  const currentYear = new Date().getUTCFullYear();
  const foundedYear = settings.founded_at
    ? new Date(`${settings.founded_at}T00:00:00Z`).getUTCFullYear()
    : null;

  return (
    <footer className="relative border-t border-sky-300/12 bg-slate-950/45 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              {settings.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logo_url}
                  alt={`${settings.community_name} logo`}
                  className="h-8 w-8 rounded-full border border-sky-400/30 object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-400/35 bg-sky-500/10 text-sky-300">
                  <Orbit className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              <span className="font-display text-lg font-semibold text-white">
                {settings.community_name}
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              {settings.description}
            </p>
            {foundedYear && !Number.isNaN(foundedYear) && (
              <p className="mt-3 text-xs text-slate-500">
                Founded in {foundedYear} · {settings.tagline}
              </p>
            )}
            {isDemoMode && (
              <p className="mt-2 text-[11px] text-amber-300/80">
                Running in local demonstration mode with sample data.
              </p>
            )}
          </div>

          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:col-span-7"
          >
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
                Explore
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                <li>
                  <a href="#home" className="hover:text-sky-300">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-sky-300">
                    About
                  </a>
                </li>
                <li>
                  <a href="#world" className="hover:text-sky-300">
                    Our World
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
                Archive
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                <li>
                  <a href="#history" className="hover:text-sky-300">
                    Our History
                  </a>
                </li>
                <li>
                  <a href="#media" className="hover:text-sky-300">
                    Community Media
                  </a>
                </li>
                <li>
                  <a href="#connect" className="hover:text-sky-300">
                    Join Community
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
                Platforms
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2.5">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900/70 text-slate-300 transition hover:border-sky-400/45 hover:text-sky-300"
                    >
                      <PlatformIcon platform={link.platform} className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>
            © {foundedYear && foundedYear < currentYear ? `${foundedYear}–` : ""}
            {currentYear} {settings.community_name}. All rights reserved.
          </p>
          <p className="text-slate-500">
            One community. One world. Countless connections.
          </p>
        </div>
      </div>
    </footer>
  );
}
