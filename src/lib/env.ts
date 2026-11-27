export const DEFAULT_DISCORD_INVITE_URL = "https://discord.gg/NNXXb9DKJv";
export const DEFAULT_DISCORD_GUILD_ID = "1423856051068997644";

export interface RuntimeEnvStatus {
  hasSupabasePublic: boolean;
  hasSupabaseServiceRole: boolean;
  hasDirectPostgres: boolean;
  hasYouTubeConfig: boolean;
  hasYouTubeApiKey: boolean;
  hasYouTubePlaylist: boolean;
  hasDiscordGuildId: boolean;
  hasDiscordInvite: boolean;
  hasDiscordWebhook: boolean;
}

function isHttpUrl(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Validates that a Discord webhook URL uses HTTPS on an official Discord host.
 */
export function isValidDiscordWebhookUrl(
  raw: string | null | undefined
): raw is string {
  if (!raw) return false;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:") return false;
    const allowedHosts = new Set([
      "discord.com",
      "discordapp.com",
      "ptb.discord.com",
      "canary.discord.com",
    ]);
    if (!allowedHosts.has(parsed.hostname.toLowerCase())) return false;
    const segments = parsed.pathname.split("/").filter(Boolean);
    return (
      segments.length >= 4 &&
      segments[0] === "api" &&
      segments[1] === "webhooks" &&
      /^\d{17,20}$/.test(segments[2]) &&
      segments[3].length >= 16
    );
  } catch {
    return false;
  }
}

export function getPublicSupabaseConfig(): {
  url: string;
  anonKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableOrAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !publishableOrAnonKey) {
    return null;
  }
  return { url, anonKey: publishableOrAnonKey };
}

export function getServiceRoleKey(): string | null {
  if (typeof window !== "undefined") {
    return null;
  }
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export const getSupabaseSecretKey = getServiceRoleKey;

export function getDirectDatabaseUrl(): string | null {
  if (typeof window !== "undefined") {
    return null;
  }
  const url = process.env.DATABASE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

/**
 * Returns the configured public Discord invitation URL from environment config,
 * falling back to PastCraft's official invite.
 */
export function getConfiguredDiscordInviteUrl(): string {
  const fromEnv = process.env.DISCORD_INVITE_URL?.trim();
  return isHttpUrl(fromEnv) ? fromEnv : DEFAULT_DISCORD_INVITE_URL;
}

/**
 * Resolves the effective Discord invitation URL from community settings or env config.
 */
export function resolveDiscordInviteUrl(
  settingsDiscordUrl?: string | null
): string {
  const fromSettings = settingsDiscordUrl?.trim();
  if (isHttpUrl(fromSettings)) {
    return fromSettings;
  }
  return getConfiguredDiscordInviteUrl();
}

/**
 * Returns the server-configured Discord Guild ID for public widget retrieval.
 * Setting DISCORD_GUILD_ID="" explicitly disables widget lookup.
 */
export function getDiscordGuildId(): string | null {
  if (typeof window !== "undefined") {
    return null;
  }
  const raw = process.env.DISCORD_GUILD_ID;
  if (raw === undefined) {
    return DEFAULT_DISCORD_GUILD_ID;
  }
  const trimmed = raw.trim();
  return /^\d{17,20}$/.test(trimmed) ? trimmed : null;
}

/**
 * Returns the private server-only Discord webhook URL for #pastcraft-log notifications.
 * Never accessible from browser code.
 */
export function getDiscordWebhookUrl(): string | null {
  if (typeof window !== "undefined") {
    return null;
  }
  const raw = process.env.DISCORD_WEBHOOK_URL?.trim();
  return isValidDiscordWebhookUrl(raw) ? raw : null;
}

/**
 * Reads server-only YouTube Data API v3 configuration.
 * Prefers YOUTUBE_PLAYLIST_ID as the official content source while retaining
 * backward-compatible support for legacy uploads playlist or channel lookup.
 */
export function getYouTubeServerConfig(settingsChannelId?: string | null): {
  apiKey: string | null;
  playlistId: string | null;
  channelId: string | null;
  uploadsPlaylistId: string | null;
} {
  if (typeof window !== "undefined") {
    return {
      apiKey: null,
      playlistId: null,
      channelId: null,
      uploadsPlaylistId: null,
    };
  }
  const apiKey = process.env.YOUTUBE_API_KEY?.trim() || null;
  const configuredPlaylistId = process.env.YOUTUBE_PLAYLIST_ID?.trim() || null;
  const uploadsPlaylistId =
    process.env.YOUTUBE_UPLOADS_PLAYLIST_ID?.trim() || null;
  const playlistId = configuredPlaylistId || uploadsPlaylistId;
  const channelId =
    settingsChannelId?.trim() ||
    process.env.YOUTUBE_CHANNEL_ID?.trim() ||
    null;

  return { apiKey, playlistId, channelId, uploadsPlaylistId };
}

export function getRuntimeEnvStatus(
  settingsChannelId?: string | null,
  settingsDiscordUrl?: string | null
): RuntimeEnvStatus {
  const supa = getPublicSupabaseConfig();
  const yt = getYouTubeServerConfig(settingsChannelId);
  const discordGuildId = getDiscordGuildId();
  const discordInvite = resolveDiscordInviteUrl(settingsDiscordUrl);
  const discordWebhook = getDiscordWebhookUrl();

  return {
    hasSupabasePublic: Boolean(supa),
    hasSupabaseServiceRole: Boolean(getServiceRoleKey()),
    hasDirectPostgres: Boolean(getDirectDatabaseUrl()),
    hasYouTubeConfig: Boolean(yt.apiKey && (yt.playlistId || yt.channelId)),
    hasYouTubeApiKey: Boolean(yt.apiKey),
    hasYouTubePlaylist: Boolean(yt.playlistId),
    hasDiscordGuildId: Boolean(discordGuildId),
    hasDiscordInvite: Boolean(discordInvite),
    hasDiscordWebhook: Boolean(discordWebhook),
  };
}
