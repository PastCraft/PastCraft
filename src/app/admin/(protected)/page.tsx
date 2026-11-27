import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  CircleDashed,
  Film,
  Globe2,
  History,
  Settings,
  Share2,
  Users,
} from "lucide-react";
import { getRuntimeEnvStatus } from "@/lib/env";
import { getAdminRepository } from "@/lib/repositories";
import { getDiscordWidgetSummary } from "@/lib/services/discord-widget";
import { getCommunityYouTubeVideos } from "@/lib/services/youtube";
import { formatNumber } from "@/lib/utils/format";
import { computeCommunityStatistics } from "@/lib/utils/geography";

function formatAuditTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
}

export default async function AdminOverviewPage() {
  const repo = await getAdminRepository();
  const [
    settings,
    locations,
    history,
    socialLinks,
    featuredVideos,
    auditLogs,
    discordWidget,
    youtubeFeed,
  ] = await Promise.all([
    repo.getSettings(),
    repo.listLocations({ includeUnpublished: true }),
    repo.listTimelineEvents({ includeUnpublished: true }),
    repo.listSocialLinks({ includeUnpublished: true }),
    repo.listFeaturedVideos({ includeUnfeatured: true }),
    repo.listAuditLogs({ limit: 8 }),
    getDiscordWidgetSummary(),
    getCommunityYouTubeVideos(),
  ]);

  const stats = computeCommunityStatistics(locations, history);
  const envStatus = getRuntimeEnvStatus(
    settings.youtube_channel_id,
    settings.discord_url
  );
  const publishedSocialCount = socialLinks.filter((s) => s.is_published).length;
  const featuredCount = featuredVideos.filter(
    (v) => v.is_featured && !v.is_hidden
  ).length;
  const hiddenVideoCount = featuredVideos.filter((v) => v.is_hidden).length;

  const cards = [
    {
      title: "Community Locations",
      value: `${stats.publishedLocations} / ${locations.length}`,
      subtitle: "Published / total city & country hubs",
      href: "/admin/locations",
      icon: Globe2,
    },
    {
      title: "Represented Members",
      value: formatNumber(stats.totalMembers),
      subtitle: `Across ${stats.countriesRepresented} countries`,
      href: "/admin/locations",
      icon: Users,
    },
    {
      title: "Timeline Milestones",
      value: `${stats.communityMilestones} / ${history.length}`,
      subtitle: "Published / total historical entries",
      href: "/admin/history",
      icon: History,
    },
    {
      title: "Social Connections",
      value: `${publishedSocialCount} / ${socialLinks.length}`,
      subtitle: "Active / configured platform links",
      href: "/admin/social-links",
      icon: Share2,
    },
    {
      title: "Media Curation",
      value: `${featuredCount} featured`,
      subtitle:
        hiddenVideoCount > 0
          ? `${hiddenVideoCount} hidden · ${youtubeFeed.videos.length} live videos`
          : `${youtubeFeed.videos.length} live playlist videos`,
      href: "/admin/youtube",
      icon: Film,
    },
    {
      title: "Website Identity",
      value: settings.community_name,
      subtitle: `Globe theme: ${settings.globe_texture}`,
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  const integrations = [
    {
      label: "Supabase Auth & PostgreSQL",
      active: envStatus.hasSupabasePublic || envStatus.hasDirectPostgres,
      detail: envStatus.hasSupabasePublic
        ? "Connected via Supabase client with RLS"
        : envStatus.hasDirectPostgres
        ? "Connected via direct PostgreSQL adapter"
        : "Running on local fallback seed repository",
    },
    {
      label: "Social & Discord Invitation",
      active: envStatus.hasDiscordInvite && publishedSocialCount > 0,
      detail: `${publishedSocialCount} published platform links · Official Discord invite active`,
    },
    {
      label: "Discord Server Widget",
      active: discordWidget.status === "online",
      detail:
        discordWidget.status === "online"
          ? `${discordWidget.serverName} reachable${
              typeof discordWidget.presenceCount === "number"
                ? ` (${formatNumber(discordWidget.presenceCount)} online)`
                : ""
            }`
          : envStatus.hasDiscordGuildId
          ? "Configured via DISCORD_GUILD_ID, currently standby or widget disabled in Discord"
          : "Set DISCORD_GUILD_ID in server environment to enable live status",
    },
    {
      label: "Discord Logging (#pastcraft-log)",
      active: envStatus.hasDiscordWebhook,
      detail: envStatus.hasDiscordWebhook
        ? "Server-side webhook configured (credentials hidden)"
        : "Set private DISCORD_WEBHOOK_URL env var to enable #pastcraft-log notifications",
    },
    {
      label: "YouTube Media Integration",
      active: envStatus.hasYouTubeConfig && youtubeFeed.status === "ok",
      detail: !envStatus.hasYouTubeApiKey
        ? "Set server-side YOUTUBE_API_KEY and YOUTUBE_PLAYLIST_ID to enable video sync"
        : youtubeFeed.status === "ok"
        ? `Connected (${youtubeFeed.videos.length} public videos cached)`
        : "Credentials configured; upstream YouTube feed currently unavailable",
    },
    {
      label: "Server Secret Key",
      active: envStatus.hasSupabaseServiceRole,
      detail: envStatus.hasSupabaseServiceRole
        ? "Elevated server client configured (SUPABASE_SECRET_KEY hidden)"
        : "Using authenticated admin RLS policies",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          Control Center Overview
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage {settings.community_name} locations, timeline milestones,
          YouTube broadcasts, Discord integrations, and social platforms without
          editing code.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="glass-panel glass-panel-hover flex flex-col justify-between rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                  {card.title}
                </span>
                <Icon className="h-4 w-4 text-sky-400" aria-hidden="true" />
              </div>
              <p className="mt-4 truncate font-display text-2xl font-semibold text-white">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{card.subtitle}</p>
            </Link>
          );
        })}
      </div>

      <section className="glass-panel rounded-2xl p-6">
        <h2 className="font-display text-base font-semibold text-white">
          Environment & Integration Status
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Secret credentials (API keys, webhook tokens, service role keys) are
          managed solely via deployment environment variables and are never
          displayed here.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-800/90 bg-slate-950/60 p-4"
            >
              <div className="flex items-center gap-2">
                {item.active ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleDashed
                    className="h-4 w-4 shrink-0 text-amber-300"
                    aria-hidden="true"
                  />
                )}
                <span className="text-xs font-semibold text-white">
                  {item.label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky-400" aria-hidden="true" />
          <h2 className="font-display text-base font-semibold text-white">
            Recent Administrative Activity
          </h2>
        </div>
        {auditLogs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            No administrative audit events recorded yet. Mutations across
            locations, history, social links, media, and settings will appear
            here and optionally notify <code>#pastcraft-log</code>.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {auditLogs.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col justify-between gap-1 rounded-xl border border-slate-800/80 bg-slate-950/55 px-4 py-3 text-xs sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <span className="inline-block rounded-md bg-sky-500/15 px-2 py-0.5 font-mono text-[11px] text-sky-300">
                    {entry.event_type}
                  </span>
                  <p className="mt-1 text-slate-200">{entry.description}</p>
                </div>
                <time
                  dateTime={entry.created_at}
                  className="shrink-0 font-mono text-[11px] text-slate-500"
                >
                  {formatAuditTimestamp(entry.created_at)} UTC
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
