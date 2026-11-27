import { z } from "zod";
import { getDiscordGuildId, resolveDiscordInviteUrl } from "@/lib/env";
import { getPublicRepository } from "@/lib/repositories";
import type { CommunitySettings, DiscordWidgetSummary } from "@/types/community";

interface CachedWidgetEntry {
  expiresAt: number;
  data: DiscordWidgetSummary;
}

const CACHE_TTL_MS = 60 * 1000; // ~60 seconds
const FETCH_TIMEOUT_MS = 4500;

/**
 * Strictly validates only approved aggregated guild fields from Discord's widget JSON.
 * Unknown properties (such as `members`, `channels`, avatars, statuses, and activities)
 * are automatically stripped and never forwarded to browsers.
 */
const discordWidgetUpstreamSchema = z.object({
  name: z.string().trim().min(1).max(120),
  presence_count: z.number().int().min(0).max(10_000_000).optional(),
});

const globalForDiscordWidget = globalThis as unknown as {
  __pastcraftDiscordWidgetCache?: Map<string, CachedWidgetEntry>;
};

function getWidgetCache(): Map<string, CachedWidgetEntry> {
  if (!globalForDiscordWidget.__pastcraftDiscordWidgetCache) {
    globalForDiscordWidget.__pastcraftDiscordWidgetCache = new Map();
  }
  return globalForDiscordWidget.__pastcraftDiscordWidgetCache;
}

export function clearDiscordWidgetCache(): void {
  getWidgetCache().clear();
}

function buildFallbackSummary(
  status: "unavailable" | "unconfigured",
  serverName: string,
  inviteUrl: string
): DiscordWidgetSummary {
  return {
    name: serverName,
    available: false,
    status,
    serverName,
    presenceCount: null,
    inviteUrl,
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves and caches a privacy-filtered summary of PastCraft's Discord server
 * from Discord's public guild widget endpoint using DISCORD_GUILD_ID on the server.
 */
export async function getDiscordWidgetSummary(options?: {
  forceRefresh?: boolean;
  settings?: CommunitySettings;
}): Promise<DiscordWidgetSummary> {
  const settings =
    options?.settings ?? (await (await getPublicRepository()).getSettings());
  const inviteUrl = resolveDiscordInviteUrl(settings.discord_url);
  const fallbackServerName = settings.community_name || "PastCraft";
  const guildId = getDiscordGuildId();

  if (!guildId) {
    return buildFallbackSummary("unconfigured", fallbackServerName, inviteUrl);
  }

  const cacheKey = `${guildId}|${inviteUrl}`;
  const now = Date.now();
  const cachedEntry = getWidgetCache().get(cacheKey);
  if (!options?.forceRefresh && cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.data;
  }

  const endpoint = `https://discord.com/api/guilds/${encodeURIComponent(
    guildId
  )}/widget.json`;

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return buildFallbackSummary("unavailable", fallbackServerName, inviteUrl);
    }

    const rawJson: unknown = await response.json();
    const parsed = discordWidgetUpstreamSchema.safeParse(rawJson);

    if (!parsed.success) {
      return buildFallbackSummary("unavailable", fallbackServerName, inviteUrl);
    }

    const resolvedName = parsed.data.name || fallbackServerName;
    const summary: DiscordWidgetSummary = {
      name: resolvedName,
      available: true,
      status: "online",
      serverName: resolvedName,
      presenceCount:
        typeof parsed.data.presence_count === "number"
          ? parsed.data.presence_count
          : null,
      inviteUrl,
      cachedAt: new Date().toISOString(),
    };

    getWidgetCache().set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      data: summary,
    });

    return summary;
  } catch {
    return buildFallbackSummary("unavailable", fallbackServerName, inviteUrl);
  }
}
