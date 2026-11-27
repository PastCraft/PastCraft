"use client";

import { useMemo, useState } from "react";
import { Calendar, ExternalLink } from "lucide-react";
import type { TimelineEvent } from "@/types/community";

interface HistorySectionProps {
  events: TimelineEvent[];
}

function formatTimelineDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function HistorySection({ events }: HistorySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Always enforce chronological order (event_date ASC, then sort_order ASC)
  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) =>
        a.event_date.localeCompare(b.event_date) || a.sort_order - b.sort_order
    );
  }, [events]);

  const categories = useMemo(() => {
    const distinct = Array.from(
      new Set(
        sortedEvents
          .map((ev) => ev.category)
          .filter((c): c is string => Boolean(c))
      )
    );
    return ["All", ...distinct];
  }, [sortedEvents]);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === "All") return sortedEvents;
    return sortedEvents.filter((ev) => ev.category === selectedCategory);
  }, [sortedEvents, selectedCategory]);

  return (
    <section
      id="history"
      aria-labelledby="history-heading"
      className="relative py-24 sm:py-32"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-sky-400 uppercase">
            PastCraft History
          </p>
          <h2
            id="history-heading"
            className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Milestones Across Our Universe
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-300">
            From our earliest server worlds and late-night conversations to an
            international community spanning continents—every chapter that
            shaped PastCraft.
          </p>
        </div>

        {categories.length > 2 && (
          <div
            role="group"
            aria-label="Filter timeline by category"
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                aria-pressed={selectedCategory === category}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  selectedCategory === category
                    ? "border border-sky-400/50 bg-sky-500/20 text-sky-100"
                    : "border border-slate-800 bg-slate-950/65 text-slate-300 hover:border-slate-600 hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {filteredEvents.length === 0 ? (
          <p className="mt-12 glass-panel rounded-2xl p-8 text-center text-sm text-slate-400">
            No historical milestones published in this category yet.
          </p>
        ) : (
          <ol className="relative mt-14 space-y-8 before:absolute before:top-2 before:bottom-2 before:left-4 before:w-px before:bg-gradient-to-b before:from-sky-400/60 before:via-sky-500/25 before:to-transparent md:before:left-1/2 md:before:-translate-x-1/2">
            {filteredEvents.map((event, idx) => {
              const isLeft = idx % 2 === 0;
              return (
                <li
                  key={event.id}
                  className="relative flex flex-col md:flex-row md:items-center"
                >
                  {/* Orbital Timeline Node */}
                  <span
                    aria-hidden="true"
                    className="absolute top-6 left-4 z-10 flex h-3.5 w-3.5 -translate-x-1/2 items-center justify-center rounded-full border border-sky-300 bg-sky-400 shadow-[0_0_14px_#38bdf8] md:left-1/2"
                  />

                  <div
                    className={`w-full pl-11 md:w-1/2 md:pl-0 ${
                      isLeft ? "md:pr-10" : "md:ml-auto md:pl-10"
                    }`}
                  >
                    <article className="glass-panel glass-panel-hover rounded-2xl p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <time
                          dateTime={event.event_date}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-300"
                        >
                          <Calendar
                            className="h-3.5 w-3.5 text-sky-400"
                            aria-hidden="true"
                          />
                          {formatTimelineDate(event.event_date)}
                        </time>

                        {event.category && (
                          <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-200">
                            {event.category}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 font-display text-lg font-semibold text-white">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {event.description}
                      </p>

                      {event.image_url && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800/90">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event.image_url}
                            alt={event.title}
                            loading="lazy"
                            decoding="async"
                            className="h-44 w-full object-cover"
                          />
                        </div>
                      )}

                      {event.external_url && (
                        <div className="mt-4">
                          <a
                            href={event.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-300 transition hover:text-sky-200"
                          >
                            <span>Explore milestone link</span>
                            <ExternalLink
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </a>
                        </div>
                      )}
                    </article>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
