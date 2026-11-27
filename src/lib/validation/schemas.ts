import { z } from "zod";

const isHttpUrl = (val: string) => /^https?:\/\//i.test(val);

const nullableHttpUrlCreate = z
  .union([
    z.string().trim().url().refine(isHttpUrl, {
      message: "URL must start with http:// or https://",
    }),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((val) => (val && val.trim().length > 0 ? val.trim() : null));

const nullableHttpUrlPatch = z
  .union([
    z.string().trim().url().refine(isHttpUrl, {
      message: "URL must start with http:// or https://",
    }),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    return val && val.trim().length > 0 ? val.trim() : null;
  });

const nullableTextCreate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((val) => (val && val.trim().length > 0 ? val.trim() : null));

const nullableTextPatch = z
  .union([z.string(), z.null()])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    return val && val.trim().length > 0 ? val.trim() : null;
  });

const nullableCategoryCreate = z
  .union([z.string().trim().max(60, "Category must be 60 characters or fewer"), z.null()])
  .optional()
  .transform((val) => (val && val.trim().length > 0 ? val.trim() : null));

const nullableCategoryPatch = z
  .union([z.string().trim().max(60, "Category must be 60 characters or fewer"), z.null()])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    return val && val.trim().length > 0 ? val.trim() : null;
  });

export const locationCreateSchema = z.object({
  city: z.string().trim().min(1, "City is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  country_code: z
    .string()
    .trim()
    .min(2, "ISO country code must be 2–3 letters")
    .max(3)
    .regex(/^[A-Za-z]{2,3}$/, "Country code must contain letters only")
    .transform((v) => v.toUpperCase()),
  continent: z.string().trim().max(50).optional(),
  // Round to 4 decimal places max (~city/district precision, never exact home GPS)
  latitude: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90")
    .transform((n) => Math.round(n * 10000) / 10000),
  longitude: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180")
    .transform((n) => Math.round(n * 10000) / 10000),
  member_count: z.coerce
    .number()
    .int("Member count must be an integer")
    .min(1, "Member count must be at least 1")
    .max(10_000_000),
  marker_color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Marker color must be a 6-digit hex color")
    .default("#38bdf8"),
  description: nullableTextCreate,
  is_published: z.boolean().default(true),
});

export const locationUpdateSchema = z.object({
  id: z.string().min(1, "Location ID is required"),
  city: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  country_code: z
    .string()
    .trim()
    .min(2)
    .max(3)
    .regex(/^[A-Za-z]{2,3}$/)
    .transform((v) => v.toUpperCase())
    .optional(),
  continent: z.string().trim().max(50).optional(),
  latitude: z.coerce
    .number()
    .min(-90)
    .max(90)
    .transform((n) => Math.round(n * 10000) / 10000)
    .optional(),
  longitude: z.coerce
    .number()
    .min(-180)
    .max(180)
    .transform((n) => Math.round(n * 10000) / 10000)
    .optional(),
  member_count: z.coerce.number().int().min(1).max(10_000_000).optional(),
  marker_color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  description: nullableTextPatch,
  is_published: z.boolean().optional(),
});

export const timelineEventCreateSchema = z.object({
  title: z.string().trim().min(1, "Event title is required").max(160),
  description: z.string().trim().min(1, "Description is required").max(2000),
  event_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  image_url: nullableHttpUrlCreate,
  external_url: nullableHttpUrlCreate,
  category: nullableCategoryCreate,
  sort_order: z.coerce.number().int().min(-1000).max(100000).default(0),
  is_published: z.boolean().default(true),
});

export const timelineEventUpdateSchema = z.object({
  id: z.string().min(1, "Event ID is required"),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  event_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  image_url: nullableHttpUrlPatch,
  external_url: nullableHttpUrlPatch,
  category: nullableCategoryPatch,
  sort_order: z.coerce.number().int().min(-1000).max(100000).optional(),
  is_published: z.boolean().optional(),
});

export const socialLinkCreateSchema = z.object({
  platform: z
    .string()
    .trim()
    .min(1, "Platform is required")
    .max(40)
    .transform((s) => s.toLowerCase()),
  label: z.string().trim().min(1, "Label is required").max(120),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .refine(isHttpUrl, {
      message: "URL must start with http:// or https://",
    }),
  sort_order: z.coerce.number().int().min(-1000).max(100000).default(0),
  is_published: z.boolean().default(true),
});

export const socialLinkUpdateSchema = socialLinkCreateSchema.partial().extend({
  id: z.string().min(1, "Social link ID is required"),
});

export function extractYouTubeVideoId(input: string): string {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{6,20}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      const slug = parsed.pathname.split("/").filter(Boolean)[0];
      if (slug) return slug;
    }
    const vParam = parsed.searchParams.get("v");
    if (vParam) return vParam;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const embedIdx = parts.findIndex((p) => p === "embed" || p === "shorts");
    if (embedIdx !== -1 && parts[embedIdx + 1]) {
      return parts[embedIdx + 1];
    }
  } catch {
    // Fall through to validation error in schema
  }
  return trimmed;
}

export const featuredVideoCreateSchema = z.object({
  youtube_video_id: z
    .string()
    .trim()
    .min(1, "YouTube video ID or URL is required")
    .transform(extractYouTubeVideoId)
    .refine((val) => /^[A-Za-z0-9_-]{6,20}$/.test(val), {
      message: "Must be a valid YouTube video ID or URL",
    }),
  title_override: nullableTextCreate,
  is_featured: z.boolean().default(true),
  is_hidden: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(-1000).max(100000).default(0),
});

export const featuredVideoUpdateSchema = z.object({
  id: z.string().min(1, "Featured video ID is required"),
  title_override: nullableTextPatch,
  is_featured: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(-1000).max(100000).optional(),
});

export const communitySettingsUpdateSchema = z.object({
  community_name: z.string().trim().min(1, "Community name is required").max(120).optional(),
  tagline: z.string().trim().min(1, "Tagline is required").max(240).optional(),
  hero_heading: z.string().trim().min(1, "Hero heading is required").max(160).optional(),
  description: z.string().trim().min(1, "Description is required").max(2000).optional(),
  mission: z.string().trim().max(2000).optional(),
  founded_at: z
    .union([
      z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v && v.length > 0 ? v : null;
    }),
  logo_url: nullableHttpUrlPatch,
  discord_url: nullableHttpUrlPatch,
  youtube_channel_id: nullableTextPatch,
  globe_texture: z.enum(["deep-ocean", "night-lights", "blue-marble"]).optional(),
  show_arcs: z.boolean().optional(),
  star_density: z.enum(["minimal", "balanced", "dense"]).optional(),
});
