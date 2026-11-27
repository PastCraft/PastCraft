"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Film, Play, Star, X } from "lucide-react";
import type { SocialLink, YouTubeFeedResult, YouTubeVideo } from "@/types/community";

interface MediaSectionProps {
  feed: YouTubeFeedResult;
  socialLinks: SocialLink[];
}

function formatUploadDate(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return isoString;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function MediaSection({ feed, socialLinks }: MediaSectionProps) {
  const [filterMode, setFilterMode] = useState<"all" | "featured">("all");
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const youtubeChannelLink = useMemo(
    () =>
      socialLinks.find(
        (link) => link.platform.toLowerCase() === "youtube" && link.is_published
      )?.url ?? null,
    [socialLinks]
  );

  const featuredSpotlight = useMemo(() => {
    const featured = feed.videos.filter((v) => v.isFeatured);
    if (featured.length === 0) return null;
    return [...featured].sort(
      (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
    )[0];
  }, [feed.videos]);

  const hasFeatured = Boolean(featuredSpotlight);

  const displayedVideos = useMemo(() => {
    if (filterMode === "featured") {
      return feed.videos
        .filter((v) => v.isFeatured)
        .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    }
    if (featuredSpotlight) {
      return feed.videos.filter(
        (v) => v.videoId !== featuredSpotlight.videoId
      );
    }
    return feed.videos;
  }, [feed.videos, filterMode, featuredSpotlight]);

  const openVideoPlayer = (video: YouTubeVideo) => {
    if (typeof document !== "undefined") {
      lastTriggerRef.current = document.activeElement as HTMLElement | null;
    }
    setActiveVideo(video);
  };

  const closeVideoPlayer = () => {
    setActiveVideo(null);
    lastTriggerRef.current?.focus();
  };

  useEffect(() => {
    if (!activeVideo) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveVideo(null);
        lastTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeVideo]);

  return (
    <section
      id="media"
      aria-labelledby="media-heading"
      className="relative py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-sky-400 uppercase">
              PastCraft Media
            </p>
            <h2
              id="media-heading"
              className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Stories, Highlights & Broadcasts
            </h2>
            <p className="mt-3 text-base text-slate-300">
              Watch recent uploads, event recaps, and featured community
              spotlights directly here or on YouTube.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasFeatured && (
              <div
                role="group"
                aria-label="Filter videos"
                className="inline-flex rounded-full border border-slate-700/80 bg-slate-950/75 p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  aria-pressed={filterMode === "all"}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    filterMode === "all"
                      ? "bg-sky-500/25 text-sky-100"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All Videos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("featured")}
                  aria-pressed={filterMode === "featured"}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    filterMode === "featured"
                      ? "bg-sky-500/25 text-sky-100"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Featured
                </button>
              </div>
            )}

            {youtubeChannelLink && (
              <a
                href={youtubeChannelLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-950/70 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-400/45 hover:text-white"
              >
                <span>Visit YouTube Channel</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        {feed.videos.length === 0 ? (
          <div
            data-testid="youtube-empty-state"
            className="mt-10 glass-panel rounded-3xl p-10 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
              <Film className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-white">
              {feed.status === "error"
                ? "Video Feed Temporarily Unavailable"
                : "Community Video Archive Standby"}
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
              {feed.message ||
                "YouTube video integration has not yet been configured on the server. Community videos will appear here automatically once configured."}
            </p>
            {youtubeChannelLink && (
              <div className="mt-6">
                <a
                  href={youtubeChannelLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/20 px-5 py-2.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-400/30"
                >
                  <span>Watch Directly on YouTube</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            {/* Featured Video Spotlight Layout */}
            {featuredSpotlight && filterMode === "all" && (
              <article className="glass-panel grid overflow-hidden rounded-3xl lg:grid-cols-12">
                <div className="relative aspect-video w-full overflow-hidden bg-slate-950 lg:col-span-7">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featuredSpotlight.thumbnailUrl}
                    alt={featuredSpotlight.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                  <button
                    type="button"
                    onClick={() => openVideoPlayer(featuredSpotlight)}
                    aria-label={`Play featured video ${featuredSpotlight.title}`}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border border-sky-300/60 bg-slate-950/80 text-white shadow-[0_0_30px_rgba(56,189,248,0.35)] backdrop-blur-md transition hover:scale-110 hover:bg-sky-500/35">
                      <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden="true" />
                    </span>
                  </button>
                </div>

                <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/40 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-200">
                      <Star
                        className="h-3.5 w-3.5 fill-sky-300 text-sky-300"
                        aria-hidden="true"
                      />
                      Featured Broadcast
                    </span>

                    <h3 className="mt-4 font-display text-2xl font-semibold text-white">
                      {featuredSpotlight.title}
                    </h3>

                    <time
                      dateTime={featuredSpotlight.publishedAt}
                      className="mt-2 block text-xs text-slate-400"
                    >
                      {formatUploadDate(featuredSpotlight.publishedAt)}
                    </time>

                    {featuredSpotlight.description && (
                      <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-slate-300">
                        {featuredSpotlight.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openVideoPlayer(featuredSpotlight)}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/25 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-400/35"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>Watch Spotlight</span>
                    </button>
                    <a
                      href={featuredSpotlight.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-300 hover:border-sky-400/40 hover:text-white"
                    >
                      <span>Open on YouTube</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            )}

            {/* Video Grid */}
            {displayedVideos.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayedVideos.map((video) => (
                <article
                  key={video.videoId}
                  className="glass-panel glass-panel-hover group flex flex-col overflow-hidden rounded-2xl"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                    {video.isFeatured && (
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full border border-sky-300/40 bg-slate-950/85 px-2.5 py-1 text-[11px] font-medium text-sky-200 backdrop-blur-md">
                        <Star
                          className="h-3 w-3 fill-sky-300 text-sky-300"
                          aria-hidden="true"
                        />
                        Featured
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => openVideoPlayer(video)}
                      aria-label={`Play ${video.title} in embedded player`}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="flex h-13 w-13 items-center justify-center rounded-full border border-sky-300/50 bg-slate-950/80 text-white shadow-[0_0_25px_rgba(56,189,248,0.3)] backdrop-blur-md transition group-hover:scale-110 group-hover:bg-sky-500/35">
                        <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <time
                        dateTime={video.publishedAt}
                        className="text-xs text-slate-400"
                      >
                        {formatUploadDate(video.publishedAt)}
                      </time>
                      <h3 className="mt-1.5 line-clamp-2 font-display text-base font-semibold text-white">
                        {video.title}
                      </h3>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                      <button
                        type="button"
                        onClick={() => openVideoPlayer(video)}
                        className="text-xs font-medium text-sky-300 transition hover:text-sky-200"
                      >
                        Watch in Player
                      </button>
                      <a
                        href={video.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-white"
                      >
                        <span>YouTube</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            )}
          </div>
        )}
      </div>

      {/* Accessible Embedded Video Player Modal */}
      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Playing ${activeVideo.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/88 p-4 backdrop-blur-xl"
          onClick={closeVideoPlayer}
        >
          <div
            className="glass-panel w-full max-w-4xl overflow-hidden rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h3 className="truncate pr-4 font-display text-sm font-semibold text-white sm:text-base">
                {activeVideo.title}
              </h3>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeVideoPlayer}
                aria-label="Close video player"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
                  activeVideo.videoId
                )}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
