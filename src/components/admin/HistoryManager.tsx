"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { TIMELINE_CATEGORIES, type TimelineEvent } from "@/types/community";

interface HistoryManagerProps {
  initialEvents: TimelineEvent[];
}

export function HistoryManager({ initialEvents }: HistoryManagerProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("2026-01-01");
  const [category, setCategory] = useState<string>("Community events");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(
    String(initialEvents.length + 1)
  );
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sortChronologically = (list: TimelineEvent[]) =>
    [...list].sort(
      (a, b) =>
        a.event_date.localeCompare(b.event_date) || a.sort_order - b.sort_order
    );

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setEventDate("2026-01-01");
    setCategory("Community events");
    setDescription("");
    setImageUrl("");
    setExternalUrl("");
    setSortOrder(String(events.length + 1));
    setIsPublished(true);
  };

  const startEdit = (ev: TimelineEvent) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setEventDate(ev.event_date);
    setCategory(ev.category ?? "");
    setDescription(ev.description);
    setImageUrl(ev.image_url ?? "");
    setExternalUrl(ev.external_url ?? "");
    setSortOrder(String(ev.sort_order));
    setIsPublished(ev.is_published);
    setFeedback(null);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to upload image.",
        });
        return;
      }
      setImageUrl(data.url);
      setFeedback({
        type: "success",
        text: "Image uploaded and linked to this milestone.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Network error uploading image.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      title,
      event_date: eventDate,
      category: category.trim() || null,
      description,
      image_url: imageUrl,
      external_url: externalUrl,
      sort_order: Number(sortOrder),
      is_published: isPublished,
    };

    try {
      const res = await fetch("/api/admin/history", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to save milestone.",
        });
        return;
      }

      if (editingId) {
        setEvents((prev) =>
          sortChronologically(
            prev.map((item) => (item.id === editingId ? data.event : item))
          )
        );
        setFeedback({ type: "success", text: "Milestone updated." });
      } else {
        setEvents((prev) => sortChronologically([...prev, data.event]));
        setFeedback({ type: "success", text: "Milestone created." });
      }
      resetForm();
    } catch {
      setFeedback({ type: "error", text: "Network error saving milestone." });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (ev: TimelineEvent) => {
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ev.id, is_published: !ev.is_published }),
      });
      const data = await res.json();
      if (!res.ok || !data.event) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to update visibility.",
        });
        return;
      }
      setEvents((prev) =>
        prev.map((item) => (item.id === ev.id ? data.event : item))
      );
    } catch {
      setFeedback({ type: "error", text: "Network error updating milestone." });
    }
  };

  const handleAdjustOrder = async (ev: TimelineEvent, delta: number) => {
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ev.id, sort_order: ev.sort_order + delta }),
      });
      const data = await res.json();
      if (!res.ok || !data.event) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to reorder milestone.",
        });
        return;
      }
      setEvents((prev) =>
        sortChronologically(
          prev.map((item) => (item.id === ev.id ? data.event : item))
        )
      );
    } catch {
      setFeedback({ type: "error", text: "Network error reordering milestone." });
    }
  };

  const handleDelete = async (id: string) => {
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/history?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFeedback({
          type: "error",
          text: data?.error || "Failed to delete milestone.",
        });
        return;
      }
      setEvents((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setFeedback({ type: "error", text: "Network error deleting milestone." });
    }
  };

  const categoryOptions =
    category && !TIMELINE_CATEGORIES.includes(category as never)
      ? [...TIMELINE_CATEGORIES, category]
      : [...TIMELINE_CATEGORIES];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          PastCraft History Timeline
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Preserve founding moments, Minecraft server milestones, community
          events, and expansions in chronological order.
        </p>
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

      <form
        onSubmit={handleSubmit}
        className="glass-panel space-y-4 rounded-2xl p-6"
      >
        <h2 className="font-display text-lg font-semibold text-white">
          {editingId ? "Edit Milestone" : "Add Timeline Milestone"}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-300">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Season 1 Realm Launch"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Event Date *
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Category (Optional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="">Uncategorized</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300">
            Description *
          </label>
          <textarea
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened and why it mattered to PastCraft..."
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Image URL or Upload (Optional)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
                aria-label="Upload milestone image"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                title="Upload image to Supabase Storage"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-sky-400/50 hover:text-white disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{uploading ? "..." : "Upload"}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              External Link (Optional)
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Sort Tie-Breaker Order
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-slate-600 bg-slate-950 text-sky-400"
            />
            <span>Published on public timeline</span>
          </label>

          <div className="flex items-center gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/50 bg-sky-500/25 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-400/35 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Milestone"
                  : "Add Milestone"}
              </span>
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-sky-300">
                  {ev.event_date}
                </span>
                {ev.category && (
                  <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] text-sky-200">
                    {ev.category}
                  </span>
                )}
                <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                  Order: {ev.sort_order}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    ev.is_published
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {ev.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <h3 className="mt-1.5 font-display text-base font-semibold text-white">
                {ev.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                {ev.description}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleAdjustOrder(ev, -1)}
                aria-label="Decrease sort order"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleAdjustOrder(ev, 1)}
                aria-label="Increase sort order"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleTogglePublished(ev)}
                aria-label={ev.is_published ? "Hide milestone" : "Publish milestone"}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                {ev.is_published ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => startEdit(ev)}
                aria-label={`Edit ${ev.title}`}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-300"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(ev.id)}
                aria-label={`Delete ${ev.title}`}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
