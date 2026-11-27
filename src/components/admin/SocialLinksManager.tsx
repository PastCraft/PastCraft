"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import type { SocialLink } from "@/types/community";

interface SocialLinksManagerProps {
  initialLinks: SocialLink[];
  initialDiscordUrl: string | null;
}

const PLATFORMS = [
  "discord",
  "youtube",
  "instagram",
  "tiktok",
  "x",
  "github",
  "twitch",
  "reddit",
  "website",
];

export function SocialLinksManager({
  initialLinks,
  initialDiscordUrl,
}: SocialLinksManagerProps) {
  const [links, setLinks] = useState<SocialLink[]>(initialLinks);
  const [primaryDiscordUrl, setPrimaryDiscordUrl] = useState(
    initialDiscordUrl ?? ""
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [platform, setPlatform] = useState("discord");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(String(initialLinks.length + 1));
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const sortByOrder = (list: SocialLink[]) =>
    [...list].sort((a, b) => a.sort_order - b.sort_order);

  const resetForm = () => {
    setEditingId(null);
    setPlatform("discord");
    setLabel("");
    setUrl("");
    setSortOrder(String(links.length + 1));
    setIsPublished(true);
  };

  const handleSavePrimaryDiscord = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discord_url: primaryDiscordUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: data.error || "Invalid Discord invite URL.",
      });
      return;
    }
    setFeedback({
      type: "success",
      text: "Primary Discord invitation updated across Hero, Navbar, and CTA.",
    });
  };

  const startEdit = (link: SocialLink) => {
    setEditingId(link.id);
    setPlatform(link.platform);
    setLabel(link.label);
    setUrl(link.url);
    setSortOrder(String(link.sort_order));
    setIsPublished(link.is_published);
    setFeedback(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      platform,
      label,
      url,
      sort_order: Number(sortOrder),
      is_published: isPublished,
    };

    try {
      const res = await fetch("/api/admin/social-links", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to save social link.",
        });
        return;
      }

      if (editingId) {
        setLinks((prev) =>
          sortByOrder(
            prev.map((item) => (item.id === editingId ? data.socialLink : item))
          )
        );
        setFeedback({ type: "success", text: "Social link updated." });
      } else {
        setLinks((prev) => sortByOrder([...prev, data.socialLink]));
        setFeedback({ type: "success", text: "Social link added." });
      }
      resetForm();
    } catch {
      setFeedback({ type: "error", text: "Network error saving social link." });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (link: SocialLink) => {
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/social-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: link.id, is_published: !link.is_published }),
      });
      const data = await res.json();
      if (!res.ok || !data.socialLink) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to update social link.",
        });
        return;
      }
      setLinks((prev) =>
        prev.map((item) => (item.id === link.id ? data.socialLink : item))
      );
    } catch {
      setFeedback({ type: "error", text: "Network error updating link." });
    }
  };

  const handleReorder = async (link: SocialLink, delta: number) => {
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/social-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: link.id, sort_order: link.sort_order + delta }),
      });
      const data = await res.json();
      if (!res.ok || !data.socialLink) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to reorder social link.",
        });
        return;
      }
      setLinks((prev) =>
        sortByOrder(
          prev.map((item) => (item.id === link.id ? data.socialLink : item))
        )
      );
    } catch {
      setFeedback({ type: "error", text: "Network error reordering link." });
    }
  };

  const handleDelete = async (id: string) => {
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/social-links?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFeedback({
          type: "error",
          text: data?.error || "Failed to delete social link.",
        });
        return;
      }
      setLinks((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setFeedback({ type: "error", text: "Network error deleting link." });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          Social Links & Discord Invitation
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure the primary Discord invite CTA and manage community platform
          links.
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

      {/* Primary Discord CTA Form */}
      <form
        onSubmit={handleSavePrimaryDiscord}
        className="glass-panel flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium text-sky-300">
            Primary Discord Invite URL (Hero, Navbar & Connect CTA)
          </label>
          <input
            type="url"
            value={primaryDiscordUrl}
            onChange={(e) => setPrimaryDiscordUrl(e.target.value)}
            placeholder="https://discord.gg/your-invite"
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/25 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-400/35"
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Save Discord Invite</span>
        </button>
      </form>

      {/* Social Platform Form */}
      <form
        onSubmit={handleSubmit}
        className="glass-panel space-y-4 rounded-2xl p-6"
      >
        <h2 className="font-display text-lg font-semibold text-white">
          {editingId ? "Edit Platform Link" : "Add Social Platform"}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Platform *
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm capitalize text-white"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Display Label *
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Watch on YouTube"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Platform URL *
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Display Order
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
            <span>Published publicly</span>
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
              <span>{editingId ? "Update Link" : "Add Link"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Links List */}
      <div className="space-y-3">
        {links.map((link) => (
          <div
            key={link.id}
            className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
                <PlatformIcon platform={link.platform} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">
                    {link.label}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      link.is_published
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {link.is_published ? "Published" : "Hidden"}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-400">{link.url}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleReorder(link, -1)}
                aria-label="Move link earlier"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleReorder(link, 1)}
                aria-label="Move link later"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleTogglePublished(link)}
                aria-label={link.is_published ? "Hide link" : "Publish link"}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                {link.is_published ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => startEdit(link)}
                aria-label={`Edit ${link.label}`}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-300"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(link.id)}
                aria-label={`Delete ${link.label}`}
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
