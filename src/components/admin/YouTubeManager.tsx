"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import type { FeaturedVideo, YouTubeVideo } from "@/types/community";

interface YouTubeManagerProps {
  initialChannelId: string | null;
  initialFeaturedVideos: FeaturedVideo[];
  initialRetrievedVideos: YouTubeVideo[];
  feedStatus: "ok" | "unconfigured" | "error";
  feedMessage: string | null;
  hasServerApiKey: boolean;
  hasServerPlaylistId: boolean;
}

export function YouTubeManager({
  initialChannelId,
  initialFeaturedVideos,
  initialRetrievedVideos,
  feedStatus,
  feedMessage,
  hasServerApiKey,
  hasServerPlaylistId,
}: YouTubeManagerProps) {
  const [channelId, setChannelId] = useState(initialChannelId ?? "");
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>(
    initialFeaturedVideos
  );
  const [videoInput, setVideoInput] = useState("");
  const [titleOverride, setTitleOverride] = useState("");
  const [sortOrder, setSortOrder] = useState("1");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const curationByVideoId = useMemo(() => {
    const map = new Map<string, FeaturedVideo>();
    for (const item of featuredVideos) {
      map.set(item.youtube_video_id, item);
    }
    return map;
  }, [featuredVideos]);

  const sortCurationList = (list: FeaturedVideo[]) =>
    [...list].sort((a, b) => a.sort_order - b.sort_order);

  const upsertLocalRecord = (record: FeaturedVideo) => {
    setFeaturedVideos((prev) => {
      const filtered = prev.filter(
        (v) =>
          v.id !== record.id && v.youtube_video_id !== record.youtube_video_id
      );
      return sortCurationList([...filtered, record]);
    });
  };

  const handleSaveChannel = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtube_channel_id: channelId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: data.error || "Failed to save YouTube Channel ID.",
      });
      return;
    }
    setFeedback({
      type: "success",
      text: "Optional fallback Channel ID saved and server video cache refreshed.",
    });
  };

  const handleAddFeatured = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch("/api/admin/featured-videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youtube_video_id: videoInput,
        title_override: titleOverride,
        is_featured: true,
        is_hidden: false,
        sort_order: Number(sortOrder),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: data.error || "Invalid YouTube video ID or URL.",
      });
      return;
    }

    upsertLocalRecord(data.featuredVideo);
    setVideoInput("");
    setTitleOverride("");
    setFeedback({ type: "success", text: "Featured video saved." });
  };

  const handleUpsertVideoState = async (
    youtubeVideoId: string,
    next: { is_featured?: boolean; is_hidden?: boolean; sort_order?: number }
  ) => {
    setFeedback(null);
    const existing = curationByVideoId.get(youtubeVideoId);

    try {
      const res = existing
        ? await fetch("/api/admin/featured-videos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: existing.id, ...next }),
          })
        : await fetch("/api/admin/featured-videos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              youtube_video_id: youtubeVideoId,
              is_featured: next.is_featured ?? false,
              is_hidden: next.is_hidden ?? false,
              sort_order: next.sort_order ?? featuredVideos.length + 1,
            }),
          });

      const data = await res.json();
      if (!res.ok || !data.featuredVideo) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to update video visibility.",
        });
        return;
      }

      upsertLocalRecord(data.featuredVideo);
    } catch {
      setFeedback({ type: "error", text: "Network error updating video." });
    }
  };

  const handleAdjustOrder = async (item: FeaturedVideo, delta: number) => {
    await handleUpsertVideoState(item.youtube_video_id, {
      sort_order: item.sort_order + delta,
    });
  };

  const handleDelete = async (id: string) => {
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/featured-videos?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFeedback({
          type: "error",
          text: data?.error || "Failed to remove video curation record.",
        });
        return;
      }
      setFeaturedVideos((prev) => prev.filter((v) => v.id !== id));
    } catch {
      setFeedback({ type: "error", text: "Network error deleting video." });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          YouTube Media Management
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Review retrieved PastCraft videos, spotlight featured broadcasts,
          adjust ordering, or hide selected videos from the public website.
        </p>
      </div>

      {/* Integration Status Summary (never exposes secrets or playlist collaborator links) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            {hasServerApiKey ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <CircleDashed className="h-4 w-4 text-amber-300" aria-hidden="true" />
            )}
            <span>YouTube Data API v3 Key</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {hasServerApiKey
              ? "Configured privately via YOUTUBE_API_KEY."
              : "Set YOUTUBE_API_KEY in server environment variables."}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            {hasServerPlaylistId ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <CircleDashed className="h-4 w-4 text-amber-300" aria-hidden="true" />
            )}
            <span>Configured Playlist Source</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {hasServerPlaylistId
              ? "Server-side YOUTUBE_PLAYLIST_ID active (hidden from public hero/nav)."
              : "Set YOUTUBE_PLAYLIST_ID in server environment variables."}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            {feedStatus === "ok" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <CircleDashed className="h-4 w-4 text-amber-300" aria-hidden="true" />
            )}
            <span>Feed Sync Status</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {feedStatus === "ok"
              ? `${initialRetrievedVideos.length} videos retrieved from configured source.`
              : feedMessage || "Waiting for valid YouTube server configuration."}
          </p>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-2xl border p-4 text-xs font-medium ${
            feedback.type === "success"
              ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/35 bg-rose-500/10 text-rose-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Retrieved Videos Moderation Grid */}
      <section className="glass-panel space-y-4 rounded-2xl p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            Retrieved Playlist Videos
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Feature individual videos, reorder highlights, or hide specific
            videos from the public gallery. Playlist contributors are managed
            separately inside YouTube.
          </p>
        </div>

        {initialRetrievedVideos.length === 0 ? (
          <p className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-5 text-center text-xs text-slate-400">
            No retrieved videos to display yet. Once{" "}
            <code>YOUTUBE_API_KEY</code> and <code>YOUTUBE_PLAYLIST_ID</code>{" "}
            are configured on the server, retrieved videos will appear here for
            featuring and moderation.
          </p>
        ) : (
          <div className="space-y-3">
            {initialRetrievedVideos.map((video) => {
              const record = curationByVideoId.get(video.videoId);
              const isHidden = Boolean(record?.is_hidden ?? video.isHidden);
              const isFeatured = Boolean(
                (record?.is_featured ?? video.isFeatured) && !isHidden
              );

              return (
                <div
                  key={video.videoId}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/90 bg-slate-950/60 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-14 w-24 shrink-0 rounded-lg border border-slate-800 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {record?.title_override || video.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-mono text-sky-300">
                          {video.videoId}
                        </span>
                        {isFeatured && (
                          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sky-200">
                            Featured #{record?.sort_order ?? video.sortOrder ?? 1}
                          </span>
                        )}
                        {isHidden && (
                          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-200">
                            Hidden from public
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpsertVideoState(video.videoId, {
                          is_featured: !isFeatured,
                          is_hidden: false,
                        })
                      }
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        isFeatured
                          ? "bg-sky-500/25 text-sky-100"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{isFeatured ? "Featured" : "Feature"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpsertVideoState(video.videoId, {
                          is_hidden: !isHidden,
                          ...(isHidden ? {} : { is_featured: false }),
                        })
                      }
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        isHidden
                          ? "bg-rose-500/20 text-rose-200"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {isHidden ? (
                        <>
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Unhide</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Hide</span>
                        </>
                      )}
                    </button>

                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${video.title} on YouTube`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Manual Pin / Feature Form */}
      <form
        onSubmit={handleAddFeatured}
        className="glass-panel space-y-4 rounded-2xl p-6"
      >
        <h2 className="font-display text-lg font-semibold text-white">
          Pin or Feature a YouTube Video by ID
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              YouTube Video URL or ID *
            </label>
            <input
              type="text"
              required
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Custom Title Override (Optional)
            </label>
            <input
              type="text"
              value={titleOverride}
              onChange={(e) => setTitleOverride(e.target.value)}
              placeholder="Optional display title..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Featured Order
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/50 bg-sky-500/25 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-400/35"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Save Video Override</span>
          </button>
        </div>
      </form>

      {/* Configured Featured & Hidden Overrides */}
      <div className="space-y-3">
        <h2 className="font-display text-base font-semibold text-white">
          Configured Video Overrides & Ordering
        </h2>
        {featuredVideos.length === 0 ? (
          <p className="glass-panel rounded-2xl p-6 text-center text-xs text-slate-400">
            No video overrides configured yet. Retrieved playlist videos display
            automatically once credentials are active.
          </p>
        ) : (
          featuredVideos.map((v) => (
            <div
              key={v.id}
              className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs text-sky-300">
                    {v.youtube_video_id}
                  </p>
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                    Order: {v.sort_order}
                  </span>
                  {v.is_hidden && (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] text-rose-200">
                      Hidden
                    </span>
                  )}
                </div>
                {v.title_override && (
                  <p className="mt-0.5 text-sm font-medium text-white">
                    {v.title_override}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustOrder(v, -1)}
                  aria-label={`Move ${v.youtube_video_id} earlier`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustOrder(v, 1)}
                  aria-label={`Move ${v.youtube_video_id} later`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpsertVideoState(v.youtube_video_id, {
                      is_featured: !v.is_featured,
                      ...(v.is_featured ? {} : { is_hidden: false }),
                    })
                  }
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                    v.is_featured
                      ? "bg-sky-500/20 text-sky-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <Star className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{v.is_featured ? "Featured" : "Standard"}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpsertVideoState(v.youtube_video_id, {
                      is_hidden: !v.is_hidden,
                      ...(v.is_hidden ? {} : { is_featured: false }),
                    })
                  }
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                    v.is_hidden
                      ? "bg-rose-500/20 text-rose-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {v.is_hidden ? (
                    <>
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Unhide</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Hide</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(v.id)}
                  aria-label={`Remove ${v.youtube_video_id}`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Optional Fallback Channel ID */}
      <form
        onSubmit={handleSaveChannel}
        className="glass-panel flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-300">
            Optional Fallback YouTube Channel ID (used only if YOUTUBE_PLAYLIST_ID
            is unset)
          </label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="UC_x5XG1OV2P6uZZ5FSM9Ttw"
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/25 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-400/35"
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Save Channel ID</span>
        </button>
      </form>
    </div>
  );
}
