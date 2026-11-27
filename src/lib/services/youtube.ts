import { getYouTubeServerConfig } from "@/lib/env";
import { getPublicRepository } from "@/lib/repositories";
import { notifyIntegrationError } from "@/lib/services/discord-webhook";
import type {
  FeaturedVideo,
  YouTubeFeedResult,
  YouTubeVideo,
} from "@/types/community";

interface CachedFeedEntry {
  expiresAt: number;
  data: YouTubeFeedResult;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const FETCH_TIMEOUT_MS = 8000;

const globalForYouTube = globalThis as unknown as {
  __pastcraftYouTubeCache?: Map<string, CachedFeedEntry>;
  __pastcraftPlaylistIdCache?: Map<string, string>;
};

function getFeedCache(): Map<string, CachedFeedEntry> {
  if (!globalForYouTube.__pastcraftYouTubeCache) {
    globalForYouTube.__pastcraftYouTubeCache = new Map();
  }
  return globalForYouTube.__pastcraftYouTubeCache;
}

function getPlaylistCache(): Map<string, string> {
  if (!globalForYouTube.__pastcraftPlaylistIdCache) {
    globalForYouTube.__pastcraftPlaylistIdCache = new Map();
  }
  return globalForYouTube.__pastcraftPlaylistIdCache;
}

export function clearYouTubeCache(): void {
  getFeedCache().clear();
  getPlaylistCache().clear();
}

interface YouTubeThumbnailMap {
  maxres?: { url?: string };
  standard?: { url?: string };
  high?: { url?: string };
  medium?: { url?: string };
  default?: { url?: string };
}

function pickThumbnailUrl(
  videoId: string,
  thumbnails?: YouTubeThumbnailMap
): string {
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  );
}

async function resolveUploadsPlaylistId(
  channelIdentifier: string,
  apiKey: string
): Promise<string | null> {
  const cached = getPlaylistCache().get(channelIdentifier);
  if (cached) return cached;

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "contentDetails");
  if (channelIdentifier.startsWith("@")) {
    url.searchParams.set("forHandle", channelIdentifier.slice(1));
  } else {
    url.searchParams.set("id", channelIdentifier);
  }
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`YouTube channels.list failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    items?: Array<{
      contentDetails?: {
        relatedPlaylists?: {
          uploads?: string;
        };
      };
    }>;
  };

  const uploadsId =
    payload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;

  if (uploadsId) {
    getPlaylistCache().set(channelIdentifier, uploadsId);
  }
  return uploadsId;
}

interface RawPlaylistItem {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    channelTitle?: string;
    thumbnails?: YouTubeThumbnailMap;
    resourceId?: {
      videoId?: string;
    };
  };
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
}

function normalizePlaylistItems(
  items: RawPlaylistItem[],
  curationMap: Map<string, FeaturedVideo>,
  fallbackChannelTitle: string,
  includeHidden: boolean
): YouTubeVideo[] {
  const normalized: YouTubeVideo[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    const videoId =
      item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
    if (!videoId || seenIds.has(videoId)) continue;
    seenIds.add(videoId);

    const rawTitle = item.snippet?.title ?? "";
    if (rawTitle === "Private video" || rawTitle === "Deleted video") {
      continue;
    }

    const record = curationMap.get(videoId);
    const isHidden = Boolean(record?.is_hidden);
    if (isHidden && !includeHidden) {
      continue;
    }

    const isFeatured = Boolean(record?.is_featured && !isHidden);
    const publishedAt =
      item.contentDetails?.videoPublishedAt ||
      item.snippet?.publishedAt ||
      new Date().toISOString();

    normalized.push({
      videoId,
      title:
        record?.title_override ||
        rawTitle ||
        `${fallbackChannelTitle} Broadcast`,
      description: item.snippet?.description ?? "",
      thumbnailUrl: pickThumbnailUrl(videoId, item.snippet?.thumbnails),
      publishedAt,
      channelTitle: item.snippet?.channelTitle ?? fallbackChannelTitle,
      youtubeUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      isFeatured,
      ...(includeHidden ? { isHidden } : {}),
      sortOrder: isFeatured ? (record?.sort_order ?? 0) : null,
    });
  }

  // Sort newest uploads first
  return normalized.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * Retrieves and caches public YouTube videos on the server using the configured
 * server-side `YOUTUBE_PLAYLIST_ID` (via `playlistItems.list`), with fallback to
 * channel uploads lookup if only a Channel ID is configured.
 *
 * Security & privacy invariants:
 * - Never exposes `YOUTUBE_API_KEY` or `YOUTUBE_PLAYLIST_ID` in responses.
 * - Excludes hidden videos from public responses.
 */
export async function getCommunityYouTubeVideos(options?: {
  forceRefresh?: boolean;
  includeHidden?: boolean;
}): Promise<YouTubeFeedResult> {
  const includeHidden = Boolean(options?.includeHidden);
  const repo = await getPublicRepository();
  const [settings, curationRecords] = await Promise.all([
    repo.getSettings(),
    repo.listFeaturedVideos({ includeUnfeatured: true }),
  ]);

  const fallbackChannelTitle = settings.community_name || "PastCraft";

  const { apiKey, playlistId: configuredPlaylistId, channelId } =
    getYouTubeServerConfig(settings.youtube_channel_id);

  if (!apiKey || (!configuredPlaylistId && !channelId)) {
    return {
      videos: [],
      status: "unconfigured",
      message:
        "YouTube media integration is ready—configure YOUTUBE_API_KEY and YOUTUBE_PLAYLIST_ID on the server to display PastCraft community videos.",
      source: null,
      cachedAt: new Date().toISOString(),
    };
  }

  const source: "playlist" | "channel" = configuredPlaylistId
    ? "playlist"
    : "channel";
  const curationSignature = curationRecords
    .map(
      (f) =>
        `${f.youtube_video_id}:${f.is_featured ? 1 : 0}:${
          f.is_hidden ? 1 : 0
        }:${f.sort_order}:${f.title_override ?? ""}`
    )
    .join(",");
  const cacheKey = `${configuredPlaylistId ?? ""}|${channelId ?? ""}|${
    includeHidden ? "all" : "public"
  }|${curationSignature}`;
  const now = Date.now();
  const cachedEntry = getFeedCache().get(cacheKey);

  if (!options?.forceRefresh && cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.data;
  }

  try {
    const targetPlaylistId =
      configuredPlaylistId ||
      (channelId ? await resolveUploadsPlaylistId(channelId, apiKey) : null);

    if (!targetPlaylistId) {
      return {
        videos: [],
        status: "error",
        message:
          "Could not resolve the configured YouTube media source. Verify YOUTUBE_PLAYLIST_ID or Channel ID configuration.",
        source,
        cachedAt: new Date().toISOString(),
      };
    }

    const listUrl = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems"
    );
    listUrl.searchParams.set("part", "snippet,contentDetails");
    listUrl.searchParams.set("playlistId", targetPlaylistId);
    listUrl.searchParams.set("maxResults", "24");
    listUrl.searchParams.set("key", apiKey);

    const response = await fetch(listUrl.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      throw new Error(
        `YouTube playlistItems.list failed with status ${response.status}`
      );
    }

    const payload = (await response.json()) as {
      items?: RawPlaylistItem[];
    };

    const curationMap = new Map<string, FeaturedVideo>();
    for (const record of curationRecords) {
      curationMap.set(record.youtube_video_id, record);
    }

    const videos = normalizePlaylistItems(
      payload.items ?? [],
      curationMap,
      fallbackChannelTitle,
      includeHidden
    );

    // Fetch any explicitly featured (and non-hidden) videos not in the retrieved page
    const presentIds = new Set(videos.map((v) => v.videoId));
    const missingFeaturedIds = curationRecords
      .filter(
        (f) =>
          f.is_featured &&
          (!f.is_hidden || includeHidden) &&
          !presentIds.has(f.youtube_video_id)
      )
      .map((f) => f.youtube_video_id);

    if (missingFeaturedIds.length > 0) {
      const extraUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      extraUrl.searchParams.set("part", "snippet");
      extraUrl.searchParams.set("id", missingFeaturedIds.slice(0, 10).join(","));
      extraUrl.searchParams.set("key", apiKey);

      const extraRes = await fetch(extraUrl.toString(), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 900 },
      });
      if (extraRes.ok) {
        const extraData = (await extraRes.json()) as {
          items?: Array<{
            id?: string;
            snippet?: {
              title?: string;
              description?: string;
              publishedAt?: string;
              channelTitle?: string;
              thumbnails?: YouTubeThumbnailMap;
            };
          }>;
        };

        for (const v of extraData.items ?? []) {
          if (!v.id) continue;
          const record = curationMap.get(v.id);
          const isHidden = Boolean(record?.is_hidden);
          if (isHidden && !includeHidden) continue;

          videos.push({
            videoId: v.id,
            title:
              record?.title_override ||
              v.snippet?.title ||
              "Featured PastCraft Video",
            description: v.snippet?.description ?? "",
            thumbnailUrl: pickThumbnailUrl(v.id, v.snippet?.thumbnails),
            publishedAt: v.snippet?.publishedAt ?? new Date().toISOString(),
            channelTitle: v.snippet?.channelTitle ?? fallbackChannelTitle,
            youtubeUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(
              v.id
            )}`,
            isFeatured: Boolean(record?.is_featured && !isHidden),
            ...(includeHidden ? { isHidden } : {}),
            sortOrder: record?.sort_order ?? 0,
          });
        }

        videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      }
    }

    const result: YouTubeFeedResult = {
      videos,
      status: "ok",
      source,
      cachedAt: new Date().toISOString(),
    };

    getFeedCache().set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      data: result,
    });

    return result;
  } catch (err) {
    const safeReason =
      err instanceof Error ? err.message.replace(/key=[^&\s]+/gi, "key=[redacted]") : "Upstream YouTube request failed";
    void notifyIntegrationError(
      "integration.youtube_error",
      "YouTube Media Sync Error",
      `Failed to retrieve PastCraft community videos from YouTube Data API v3 (${safeReason}).`
    );

    if (cachedEntry) {
      return cachedEntry.data;
    }

    return {
      videos: [],
      status: "error",
      message:
        "Unable to retrieve YouTube videos at the moment. Please check back soon or visit our YouTube channel directly.",
      source,
      cachedAt: new Date().toISOString(),
    };
  }
}
