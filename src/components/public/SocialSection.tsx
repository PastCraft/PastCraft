import { ArrowUpRight, Radio, Users } from "lucide-react";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { formatNumber } from "@/lib/utils/format";
import type {
  CommunitySettings,
  DiscordWidgetSummary,
  SocialLink,
} from "@/types/community";

interface SocialSectionProps {
  settings: CommunitySettings;
  socialLinks: SocialLink[];
  discordWidget?: DiscordWidgetSummary;
}

export function SocialSection({
  settings,
  socialLinks,
  discordWidget,
}: SocialSectionProps) {
  const discordLink =
    settings.discord_url ||
    discordWidget?.inviteUrl ||
    socialLinks.find((l) => l.platform.toLowerCase() === "discord")?.url ||
    null;

  const secondaryLinks = socialLinks.filter(
    (link) => link.platform.toLowerCase() !== "discord"
  );

  const serverName =
    discordWidget?.name ||
    discordWidget?.serverName ||
    settings.community_name;
  const isWidgetOnline = Boolean(
    discordWidget?.available ?? discordWidget?.status === "online"
  );
  const hasLiveCount =
    isWidgetOnline && typeof discordWidget?.presenceCount === "number";

  return (
    <section
      id="connect"
      aria-labelledby="connect-heading"
      className="relative py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Primary Custom Discord Server Card (backed by server-filtered widget JSON) */}
        <div
          data-testid="discord-server-card"
          className="glass-panel relative overflow-hidden rounded-3xl p-8 sm:p-12 lg:p-14"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full opacity-35 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-xs font-semibold tracking-[0.2em] text-sky-400 uppercase">
                  Community Connections
                </p>
                <span
                  data-testid="discord-server-status"
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    isWidgetOnline
                      ? "border-emerald-400/35 bg-emerald-500/12 text-emerald-200"
                      : "border-sky-400/30 bg-sky-500/10 text-sky-200"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      isWidgetOnline ? "bg-emerald-400" : "bg-sky-400"
                    }`}
                  />
                  <span>
                    {isWidgetOnline ? "Server Online" : "Official Discord Hub"}
                  </span>
                </span>
              </div>

              <h2
                id="connect-heading"
                className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
              >
                Step Into {serverName}
              </h2>

              <p className="mt-4 text-base leading-relaxed text-slate-300">
                Discord is our primary home—where daily conversations, regional
                meetups, creative showcases, and live community events come to
                life across every time zone.
              </p>

              {/* Privacy-filtered server telemetry strip */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2.5 rounded-2xl border border-sky-300/18 bg-slate-950/65 px-4 py-2.5 text-xs text-slate-200 backdrop-blur-md">
                  <PlatformIcon
                    platform="discord"
                    className="h-4 w-4 text-sky-300"
                  />
                  <span className="font-semibold text-white">{serverName}</span>
                </div>

                {hasLiveCount ? (
                  <div
                    data-testid="discord-online-count"
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-100"
                  >
                    <Users
                      className="h-3.5 w-3.5 text-emerald-300"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="font-semibold text-white">
                        {formatNumber(discordWidget.presenceCount!)}
                      </strong>{" "}
                      online now
                    </span>
                  </div>
                ) : (
                  <div
                    data-testid="discord-widget-fallback"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-950/65 px-4 py-2.5 text-xs text-slate-400"
                  >
                    <Radio
                      className="h-3.5 w-3.5 text-sky-400/80"
                      aria-hidden="true"
                    />
                    <span>
                      Live server status currently standby · Official invite
                      active
                    </span>
                  </div>
                )}
              </div>
            </div>

            {discordLink && (
              <div className="shrink-0">
                <a
                  href={discordLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-full border border-sky-300/60 bg-sky-500/25 px-7 py-4 text-base font-semibold text-white shadow-[0_0_38px_rgba(56,189,248,0.28)] transition hover:border-sky-200 hover:bg-sky-400/35"
                >
                  <PlatformIcon
                    platform="discord"
                    className="h-5 w-5 text-sky-200"
                  />
                  <span>Join Our Discord</span>
                  <ArrowUpRight
                    className="h-4 w-4 text-sky-200"
                    aria-hidden="true"
                  />
                </a>
              </div>
            )}
          </div>

          {secondaryLinks.length > 0 && (
            <div className="relative z-10 mt-10 grid gap-4 border-t border-sky-300/12 pt-10 sm:grid-cols-2 lg:grid-cols-3">
              {secondaryLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-2xl border border-slate-800/90 bg-slate-950/60 p-4 transition hover:border-sky-400/40 hover:bg-slate-900/80"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-300 transition group-hover:border-sky-400/45 group-hover:text-sky-200">
                      <PlatformIcon
                        platform={link.platform}
                        className="h-5 w-5"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {link.label}
                      </p>
                      <p className="text-xs capitalize text-slate-400">
                        {link.platform}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sky-300"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
