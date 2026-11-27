// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FallbackCommunityRepository } from "@/lib/repositories/fallback-repository";
import { setRepositoryOverride } from "@/lib/repositories";
import {
  clearYouTubeCache,
  getCommunityYouTubeVideos,
} from "@/lib/services/youtube";

describe("YouTube Data API v3 Server Service", () => {
  const originalEnv = { ...process.env };
  let repo: FallbackCommunityRepository;

  beforeEach(() => {
    repo = new FallbackCommunityRepository(true);
    setRepositoryOverride(repo);
    clearYouTubeCache();
    delete process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_PLAYLIST_ID;
    delete process.env.YOUTUBE_CHANNEL_ID;
    delete process.env.YOUTUBE_UPLOADS_PLAYLIST_ID;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setRepositoryOverride(null);
    clearYouTubeCache();
    vi.restoreAllMocks();
  });

  it("returns an unconfigured status without crashing when credentials are absent", async () => {
    const res = await getCommunityYouTubeVideos();
    expect(res.status).toBe("unconfigured");
    expect(res.videos).toEqual([]);
    expect(res.message).toBeTruthy();
  });

  it("retrieves uploads, merges featured flags, sorts newest first, and caches responses", async () => {
    process.env.YOUTUBE_API_KEY = "test-server-only-key";
    process.env.YOUTUBE_CHANNEL_ID = "UC_TEST_PASTCRAFT";

    await repo.upsertFeaturedVideo({
      youtube_video_id: "vid_older_featured",
      title_override: "Featured Documentary",
      is_featured: true,
      sort_order: 1,
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/youtube/v3/channels")) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  contentDetails: {
                    relatedPlaylists: { uploads: "UU_TEST_PASTCRAFT_UPLOADS" },
                  },
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes("/youtube/v3/playlistItems")) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  snippet: {
                    title: "Older Upload",
                    description: "First recap",
                    publishedAt: "2026-02-10T12:00:00Z",
                    channelTitle: "PastCraft",
                    thumbnails: {
                      high: {
                        url: "https://i.ytimg.com/vi/vid_older_featured/hqdefault.jpg",
                      },
                    },
                  },
                  contentDetails: {
                    videoId: "vid_older_featured",
                    videoPublishedAt: "2026-02-10T12:00:00Z",
                  },
                },
                {
                  snippet: {
                    title: "Newest Community Relay",
                    description: "Latest upload",
                    publishedAt: "2026-08-15T18:00:00Z",
                    channelTitle: "PastCraft",
                    thumbnails: {
                      high: {
                        url: "https://i.ytimg.com/vi/vid_newest/hqdefault.jpg",
                      },
                    },
                  },
                  contentDetails: {
                    videoId: "vid_newest",
                    videoPublishedAt: "2026-08-15T18:00:00Z",
                  },
                },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response("Not found", { status: 404 });
      });

    const firstCall = await getCommunityYouTubeVideos();
    expect(firstCall.status).toBe("ok");
    expect(firstCall.videos).toHaveLength(2);
    expect(firstCall.videos[0].videoId).toBe("vid_newest");
    expect(firstCall.videos[0].isFeatured).toBe(false);
    expect(firstCall.videos[1].videoId).toBe("vid_older_featured");
    expect(firstCall.videos[1].isFeatured).toBe(true);
    expect(firstCall.videos[1].title).toBe("Featured Documentary");

    const callsAfterFirst = fetchSpy.mock.calls.length;
    expect(callsAfterFirst).toBe(2);

    const secondCall = await getCommunityYouTubeVideos();
    expect(secondCall.videos).toHaveLength(2);
    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst);
  });

  it("resolves YouTube @handle channels via forHandle query parameter", async () => {
    process.env.YOUTUBE_API_KEY = "test-server-only-key";
    process.env.YOUTUBE_CHANNEL_ID = "@PastCraft";

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/youtube/v3/channels")) {
          expect(url.searchParams.get("forHandle")).toBe("PastCraft");
          return new Response(
            JSON.stringify({
              items: [
                {
                  contentDetails: {
                    relatedPlaylists: { uploads: "UU_PASTCRAFT_HANDLE" },
                  },
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (url.pathname.endsWith("/youtube/v3/playlistItems")) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        return new Response("Not found", { status: 404 });
      });

    const result = await getCommunityYouTubeVideos();
    expect(result.status).toBe("ok");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("handles upstream YouTube API errors gracefully without throwing", async () => {
    process.env.YOUTUBE_API_KEY = "test-server-only-key";
    process.env.YOUTUBE_UPLOADS_PLAYLIST_ID = "UU_FAILING_PLAYLIST";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "quotaExceeded" }), { status: 403 })
    );

    const res = await getCommunityYouTubeVideos();
    expect(res.status).toBe("error");
    expect(res.videos).toEqual([]);
    expect(res.message).toBeTruthy();
  });

  it("retrieves configured YOUTUBE_PLAYLIST_ID via playlistItems.list, hides moderated videos, and never leaks playlistId", async () => {
    process.env.YOUTUBE_API_KEY = "test-server-only-key";
    process.env.YOUTUBE_PLAYLIST_ID = "PLraO9HlKcRgzMnWc8D_LusO1KLlIbbLw5";

    await repo.upsertFeaturedVideo({
      youtube_video_id: "vid_hidden_1",
      title_override: null,
      is_featured: false,
      is_hidden: true,
      sort_order: 2,
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = new URL(String(input));
        expect(url.pathname).toBe("/youtube/v3/playlistItems");
        expect(url.searchParams.get("playlistId")).toBe(
          "PLraO9HlKcRgzMnWc8D_LusO1KLlIbbLw5"
        );
        return new Response(
          JSON.stringify({
            items: [
              {
                snippet: {
                  title: "Public Showcase",
                  description: "Visible showcase video",
                  publishedAt: "2026-10-10T10:00:00Z",
                  channelTitle: "PastCraft",
                },
                contentDetails: {
                  videoId: "vid_public_1",
                  videoPublishedAt: "2026-10-10T10:00:00Z",
                },
              },
              {
                snippet: {
                  title: "Moderated Video",
                  description: "Should be hidden from public view",
                  publishedAt: "2026-10-12T10:00:00Z",
                  channelTitle: "PastCraft",
                },
                contentDetails: {
                  videoId: "vid_hidden_1",
                  videoPublishedAt: "2026-10-12T10:00:00Z",
                },
              },
            ],
          }),
          { status: 200 }
        );
      });

    const publicFeed = await getCommunityYouTubeVideos();
    expect(publicFeed.status).toBe("ok");
    expect(publicFeed.source).toBe("playlist");
    expect(publicFeed.videos).toHaveLength(1);
    expect(publicFeed.videos[0].videoId).toBe("vid_public_1");
    expect(JSON.stringify(publicFeed)).not.toContain(
      "PLraO9HlKcRgzMnWc8D_LusO1KLlIbbLw5"
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Admin view with includeHidden sees hidden videos so admins can unhide them
    const adminFeed = await getCommunityYouTubeVideos({ includeHidden: true });
    expect(adminFeed.videos).toHaveLength(2);
    expect(
      adminFeed.videos.find((v) => v.videoId === "vid_hidden_1")?.isHidden
    ).toBe(true);
  });
});
