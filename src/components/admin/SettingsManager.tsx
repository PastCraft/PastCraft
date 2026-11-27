"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import type {
  CommunitySettings,
  GlobeTexturePreset,
  StarDensityPreset,
} from "@/types/community";

interface SettingsManagerProps {
  initialSettings: CommunitySettings;
}

export function SettingsManager({ initialSettings }: SettingsManagerProps) {
  const [communityName, setCommunityName] = useState(
    initialSettings.community_name
  );
  const [heroHeading, setHeroHeading] = useState(initialSettings.hero_heading);
  const [tagline, setTagline] = useState(initialSettings.tagline);
  const [description, setDescription] = useState(initialSettings.description);
  const [mission, setMission] = useState(initialSettings.mission);
  const [foundedAt, setFoundedAt] = useState(
    initialSettings.founded_at ?? ""
  );
  const [logoUrl, setLogoUrl] = useState(initialSettings.logo_url ?? "");
  const [discordUrl, setDiscordUrl] = useState(
    initialSettings.discord_url ?? ""
  );
  const [globeTexture, setGlobeTexture] = useState<GlobeTexturePreset>(
    initialSettings.globe_texture
  );
  const [showArcs, setShowArcs] = useState(initialSettings.show_arcs);
  const [starDensity, setStarDensity] = useState<StarDensityPreset>(
    initialSettings.star_density
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_name: communityName,
          hero_heading: heroHeading,
          tagline,
          description,
          mission,
          founded_at: foundedAt,
          logo_url: logoUrl,
          discord_url: discordUrl,
          globe_texture: globeTexture,
          show_arcs: showArcs,
          star_density: starDensity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to update settings.",
        });
        return;
      }
      setFeedback({
        type: "success",
        text: "Website settings updated successfully.",
      });
    } catch {
      setFeedback({ type: "error", text: "Network error updating settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          General Website Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Customize community identity, hero messaging, founding date, and 3D
          atmosphere defaults.
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
        className="glass-panel space-y-6 rounded-2xl p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Community Name *
            </label>
            <input
              type="text"
              required
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Main Hero Heading *
            </label>
            <input
              type="text"
              required
              value={heroHeading}
              onChange={(e) => setHeroHeading(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300">
            Tagline *
          </label>
          <input
            type="text"
            required
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300">
            Short Introduction (Hero & Footer) *
          </label>
          <textarea
            rows={2}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300">
            Mission & Identity (About Section)
          </label>
          <textarea
            rows={3}
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Founded Date
            </label>
            <input
              type="date"
              value={foundedAt}
              onChange={(e) => setFoundedAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Logo URL (Optional)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Discord Invite URL
            </label>
            <input
              type="url"
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder="https://discord.gg/..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-800 pt-5 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Default Earth Texture
            </label>
            <select
              value={globeTexture}
              onChange={(e) =>
                setGlobeTexture(e.target.value as GlobeTexturePreset)
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
            >
              <option value="deep-ocean">Deep Ocean (Recommended)</option>
              <option value="night-lights">Night Lights</option>
              <option value="blue-marble">Blue Marble</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Starfield Density
            </label>
            <select
              value={starDensity}
              onChange={(e) =>
                setStarDensity(e.target.value as StarDensityPreset)
              }
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
            >
              <option value="minimal">Minimal</option>
              <option value="balanced">Balanced</option>
              <option value="dense">Dense</option>
            </select>
          </div>

          <div className="flex items-end pb-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={showArcs}
                onChange={(e) => setShowArcs(e.target.checked)}
                className="rounded border-slate-600 bg-slate-950 text-sky-400"
              />
              <span>Show animated connection arcs by default</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/25 px-6 py-2.5 text-xs font-semibold text-white hover:bg-sky-400/35 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{saving ? "Saving Settings..." : "Save Website Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
