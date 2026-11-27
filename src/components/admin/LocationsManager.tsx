"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import { CONTINENTS } from "@/lib/utils/geography";
import type { CommunityLocation } from "@/types/community";

interface LocationsManagerProps {
  initialLocations: CommunityLocation[];
}

const CITY_PRESETS = [
  { city: "London", country: "United Kingdom", code: "GB", continent: "Europe", lat: 51.5074, lng: -0.1278 },
  { city: "New York", country: "United States", code: "US", continent: "North America", lat: 40.7128, lng: -74.006 },
  { city: "Tokyo", country: "Japan", code: "JP", continent: "Asia", lat: 35.6762, lng: 139.6503 },
  { city: "Berlin", country: "Germany", code: "DE", continent: "Europe", lat: 52.52, lng: 13.405 },
  { city: "Paris", country: "France", code: "FR", continent: "Europe", lat: 48.8566, lng: 2.3522 },
  { city: "São Paulo", country: "Brazil", code: "BR", continent: "South America", lat: -23.5505, lng: -46.6333 },
  { city: "Sydney", country: "Australia", code: "AU", continent: "Oceania", lat: -33.8688, lng: 151.2093 },
  { city: "Nairobi", country: "Kenya", code: "KE", continent: "Africa", lat: -1.2921, lng: 36.8219 },
  { city: "Mumbai", country: "India", code: "IN", continent: "Asia", lat: 19.076, lng: 72.8777 },
  { city: "Toronto", country: "Canada", code: "CA", continent: "North America", lat: 43.6532, lng: -79.3832 },
];

const MARKER_SWATCHES = ["#38bdf8", "#7dd3fc", "#60a5fa", "#34d399", "#a78bfa", "#fbbf24"];

export function LocationsManager({ initialLocations }: LocationsManagerProps) {
  const [locations, setLocations] =
    useState<CommunityLocation[]>(initialLocations);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [continent, setContinent] = useState<string>("Europe");
  const [latitude, setLatitude] = useState("0");
  const [longitude, setLongitude] = useState("0");
  const [memberCount, setMemberCount] = useState("10");
  const [markerColor, setMarkerColor] = useState("#38bdf8");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setCity("");
    setCountry("");
    setCountryCode("");
    setContinent("Europe");
    setLatitude("0");
    setLongitude("0");
    setMemberCount("10");
    setMarkerColor("#38bdf8");
    setDescription("");
    setIsPublished(true);
  };

  const startEdit = (loc: CommunityLocation) => {
    setEditingId(loc.id);
    setCity(loc.city);
    setCountry(loc.country);
    setCountryCode(loc.country_code);
    setContinent(loc.continent || "Europe");
    setLatitude(String(loc.latitude));
    setLongitude(String(loc.longitude));
    setMemberCount(String(loc.member_count));
    setMarkerColor(loc.marker_color || "#38bdf8");
    setDescription(loc.description ?? "");
    setIsPublished(loc.is_published);
    setFeedback(null);
  };

  const applyCityPreset = (presetIndex: string) => {
    const idx = Number(presetIndex);
    if (Number.isNaN(idx) || !CITY_PRESETS[idx]) return;
    const preset = CITY_PRESETS[idx];
    setCity(preset.city);
    setCountry(preset.country);
    setCountryCode(preset.code);
    setContinent(preset.continent);
    setLatitude(String(preset.lat));
    setLongitude(String(preset.lng));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      city,
      country,
      country_code: countryCode,
      continent,
      latitude: Number(latitude),
      longitude: Number(longitude),
      member_count: Number(memberCount),
      marker_color: markerColor,
      description,
      is_published: isPublished,
    };

    try {
      const res = await fetch("/api/admin/locations", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to save location.",
        });
        return;
      }

      if (editingId) {
        setLocations((prev) =>
          prev.map((item) => (item.id === editingId ? data.location : item))
        );
        setFeedback({ type: "success", text: "Location updated." });
      } else {
        setLocations((prev) => [data.location, ...prev]);
        setFeedback({ type: "success", text: "Location added." });
      }
      resetForm();
    } catch {
      setFeedback({ type: "error", text: "Network error saving location." });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (loc: CommunityLocation) => {
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loc.id, is_published: !loc.is_published }),
      });
      const data = await res.json();
      if (!res.ok || !data.location) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to update location visibility.",
        });
        return;
      }
      setLocations((prev) =>
        prev.map((item) => (item.id === loc.id ? data.location : item))
      );
    } catch {
      setFeedback({ type: "error", text: "Network error updating location." });
    }
  };

  const handleDelete = async (id: string) => {
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/locations?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFeedback({
          type: "error",
          text: data?.error || "Failed to delete location.",
        });
        return;
      }
      setLocations((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setFeedback({ type: "error", text: "Network error deleting location." });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          Community Locations
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Add or edit voluntary city and country-level community hubs displayed
          on the 3D Earth.
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
        className="glass-panel space-y-5 rounded-2xl p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-white">
            {editingId ? "Edit Location" : "Add Community Hub"}
          </h2>

          <select
            aria-label="Fill coordinates from preset city"
            defaultValue=""
            onChange={(e) => applyCityPreset(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300"
          >
            <option value="">Quick-fill city coordinates...</option>
            {CITY_PRESETS.map((preset, idx) => (
              <option key={preset.city} value={idx}>
                {preset.city}, {preset.country}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              City *
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="London"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Country *
            </label>
            <input
              type="text"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United Kingdom"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              ISO Country Code *
            </label>
            <input
              type="text"
              required
              maxLength={3}
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="GB"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm uppercase text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Continent
            </label>
            <select
              value={continent}
              onChange={(e) => setContinent(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              {CONTINENTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Latitude (-90 to 90) *
            </label>
            <input
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              required
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Longitude (-180 to 180) *
            </label>
            <input
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              required
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Member Count *
            </label>
            <input
              type="number"
              min="1"
              required
              value={memberCount}
              onChange={(e) => setMemberCount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Marker Color
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={markerColor}
                onChange={(e) => setMarkerColor(e.target.value)}
                aria-label="Custom marker color"
                className="h-9 w-10 cursor-pointer rounded border border-slate-700 bg-slate-950"
              />
              <div className="flex gap-1">
                {MARKER_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={`Select color ${swatch}`}
                    onClick={() => setMarkerColor(swatch)}
                    className="h-5 w-5 rounded-full border border-white/25"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300">
            Regional Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief note on regional meetups or community activities..."
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-slate-600 bg-slate-950 text-sky-400"
            />
            <span>Publicly displayed on globe & directory</span>
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
                  ? "Update Location"
                  : "Add Location"}
              </span>
            </button>
          </div>
        </div>
      </form>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Coordinates</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: loc.marker_color }}
                      />
                      <div>
                        <p className="font-semibold text-white">{loc.city}</p>
                        <p className="text-slate-400">
                          {loc.country} ({loc.country_code})
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-sky-200">
                    {formatNumber(loc.member_count)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        loc.is_published
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {loc.is_published ? "Published" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePublished(loc)}
                        aria-label={
                          loc.is_published ? "Hide location" : "Publish location"
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        {loc.is_published ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(loc)}
                        aria-label={`Edit ${loc.city}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-300"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(loc.id)}
                        aria-label={`Delete ${loc.city}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
