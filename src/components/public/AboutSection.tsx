import { Globe2, HeartHandshake, Info, Sparkles, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import type { CommunitySettings, CommunityStatistics } from "@/types/community";

interface AboutSectionProps {
  settings: CommunitySettings;
  statistics: CommunityStatistics;
  isDemoMode: boolean;
}

const PILLARS = [
  {
    icon: Globe2,
    title: "Global by Nature",
    body: "Conversations flow naturally from Tokyo to Berlin, London, Nairobi, São Paulo, and New York—someone is always awake to collaborate.",
  },
  {
    icon: HeartHandshake,
    title: "Welcoming & Grounded",
    body: "Built around mutual respect, curiosity, and genuine connection rather than noise, clout chasing, or gatekeeping.",
  },
  {
    icon: Sparkles,
    title: "Shared Worlds & Craft",
    body: "From collaborative Minecraft realms and community events to stories, videos, and shared builds, members create lasting memories together.",
  },
  {
    icon: Users,
    title: "Privacy-First Representation",
    body: "Our global map celebrates voluntary city and country hubs—never personal addresses or live tracking.",
  },
];

export function AboutSection({
  settings,
  statistics,
  isDemoMode,
}: AboutSectionProps) {
  const statsItems = [
    {
      label: isDemoMode
        ? "Sample Members (Demo)"
        : "Total Members Represented",
      value: formatNumber(statistics.totalMembers),
      detail: `Across ${statistics.publishedLocations} active community hubs`,
    },
    {
      label: "Countries Represented",
      value: formatNumber(statistics.countriesRepresented),
      detail: "Connected under one shared community banner",
    },
    {
      label: "Continents Represented",
      value: formatNumber(statistics.continentsRepresented),
      detail: "Round-the-clock global time zone coverage",
    },
    {
      label: "Community Milestones",
      value: formatNumber(statistics.communityMilestones),
      detail: "Recorded chapters in our collective history",
    },
  ];

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="relative py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-sky-400 uppercase">
              About {settings.community_name}
            </p>
            <h2
              id="about-heading"
              className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              One community. One world. Countless connections.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-300">
              {settings.mission || settings.description}
            </p>
            {settings.founded_at && (
              <p className="mt-4 text-sm text-slate-400">
                Established{" "}
                <time dateTime={settings.founded_at}>
                  {new Date(`${settings.founded_at}T00:00:00Z`).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "UTC",
                    }
                  )}
                </time>
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className="glass-panel glass-panel-hover rounded-2xl p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {pillar.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        {isDemoMode && (
          <div
            role="note"
            className="mt-12 flex items-center gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100"
          >
            <Info className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <span>
              <strong>Local Demonstration Mode:</strong> No external database is
              connected yet. The figures below are calculated from sample seed
              locations and milestones rather than live community membership.
            </span>
          </div>
        )}

        {/* Real Configured Statistics */}
        <dl
          aria-label="Community statistics"
          className={`${isDemoMode ? "mt-5" : "mt-14"} grid gap-4 sm:grid-cols-2 lg:grid-cols-4`}
        >
          {statsItems.map((stat) => (
            <div
              key={stat.label}
              className="glass-panel rounded-2xl p-6 transition hover:border-sky-400/30"
            >
              <dt className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                {stat.label}
              </dt>
              <dd className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
                {stat.value}
              </dd>
              <p className="mt-2 text-xs text-sky-200/75">{stat.detail}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
