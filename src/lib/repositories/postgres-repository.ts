import { Pool } from "pg";
import { SEED_SETTINGS } from "@/lib/data/seed";
import { inferContinentFromCountryCode } from "@/lib/utils/geography";
import type {
  CommunityLocation,
  CommunitySettings,
  FeaturedVideo,
  SocialLink,
  TimelineEvent,
  WebsiteAuditLog,
} from "@/types/community";
import type {
  AuditLogCreateInput,
  CommunityRepository,
  CommunitySettingsUpdateInput,
  FeaturedVideoCreateInput,
  FeaturedVideoUpdateInput,
  LocationCreateInput,
  LocationUpdateInput,
  SocialLinkCreateInput,
  SocialLinkUpdateInput,
  TimelineEventCreateInput,
  TimelineEventUpdateInput,
} from "./types";

const globalForPg = globalThis as unknown as {
  __pastcraftPgPool?: Pool;
};

function getPgPool(connectionString: string): Pool {
  if (!globalForPg.__pastcraftPgPool) {
    globalForPg.__pastcraftPgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalForPg.__pastcraftPgPool;
}

function toDateString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  return str.length > 0 ? str.slice(0, 10) : null;
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? new Date().toISOString()
      : value.toISOString();
  }
  return value ? String(value) : new Date().toISOString();
}

function normalizeSettingsRow(row: Record<string, unknown>): CommunitySettings {
  return {
    ...SEED_SETTINGS,
    ...row,
    founded_at: toDateString(row.founded_at),
    updated_at: toIsoString(row.updated_at),
  } as CommunitySettings;
}

function normalizeLocationRow(row: Record<string, unknown>): CommunityLocation {
  const countryCode = String(row.country_code ?? "");
  const explicitContinent =
    row.continent != null ? String(row.continent) : null;
  return {
    ...row,
    continent: inferContinentFromCountryCode(countryCode, explicitContinent),
    created_at: toIsoString(row.created_at),
  } as CommunityLocation;
}

function normalizeTimelineRow(row: Record<string, unknown>): TimelineEvent {
  return {
    ...row,
    event_date: toDateString(row.event_date) ?? "1970-01-01",
    created_at: toIsoString(row.created_at),
  } as TimelineEvent;
}

/**
 * Self-hosted PostgreSQL repository implementation.
 * Decouples the backend from managed Supabase when DATABASE_URL is provided directly.
 */
export class PostgresCommunityRepository implements CommunityRepository {
  readonly source = "postgres" as const;
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = getPgPool(connectionString);
  }

  async getSettings(): Promise<CommunitySettings> {
    try {
      const { rows } = await this.pool.query(
        "SELECT * FROM public.community_settings LIMIT 1"
      );
      if (!rows[0]) return structuredClone(SEED_SETTINGS);
      return normalizeSettingsRow(rows[0]);
    } catch {
      return structuredClone(SEED_SETTINGS);
    }
  }

  async updateSettings(
    input: CommunitySettingsUpdateInput
  ): Promise<CommunitySettings> {
    const current = await this.getSettings();
    const merged = {
      ...current,
      ...input,
    };

    const { rows } = await this.pool.query(
      `INSERT INTO public.community_settings (
        id, community_name, tagline, hero_heading, description, mission,
        founded_at, logo_url, discord_url, youtube_channel_id,
        globe_texture, show_arcs, star_density, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (id) DO UPDATE SET
        community_name = EXCLUDED.community_name,
        tagline = EXCLUDED.tagline,
        hero_heading = EXCLUDED.hero_heading,
        description = EXCLUDED.description,
        mission = EXCLUDED.mission,
        founded_at = EXCLUDED.founded_at,
        logo_url = EXCLUDED.logo_url,
        discord_url = EXCLUDED.discord_url,
        youtube_channel_id = EXCLUDED.youtube_channel_id,
        globe_texture = EXCLUDED.globe_texture,
        show_arcs = EXCLUDED.show_arcs,
        star_density = EXCLUDED.star_density,
        updated_at = NOW()
      RETURNING *`,
      [
        merged.id,
        merged.community_name,
        merged.tagline,
        merged.hero_heading,
        merged.description,
        merged.mission,
        merged.founded_at,
        merged.logo_url,
        merged.discord_url,
        merged.youtube_channel_id,
        merged.globe_texture,
        merged.show_arcs,
        merged.star_density,
      ]
    );
    return normalizeSettingsRow(rows[0]);
  }

  async listLocations(options?: {
    includeUnpublished?: boolean;
  }): Promise<CommunityLocation[]> {
    const sql = options?.includeUnpublished
      ? "SELECT * FROM public.community_locations ORDER BY member_count DESC, city ASC"
      : "SELECT * FROM public.community_locations WHERE is_published = true ORDER BY member_count DESC, city ASC";
    const { rows } = await this.pool.query(sql);
    return rows.map((row) => normalizeLocationRow(row));
  }

  async createLocation(input: LocationCreateInput): Promise<CommunityLocation> {
    const continent = inferContinentFromCountryCode(
      input.country_code,
      input.continent
    );
    const { rows } = await this.pool.query(
      `INSERT INTO public.community_locations
        (city, country, country_code, continent, latitude, longitude, member_count, marker_color, description, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        input.city,
        input.country,
        input.country_code,
        continent,
        input.latitude,
        input.longitude,
        input.member_count,
        input.marker_color,
        input.description,
        input.is_published,
      ]
    );
    return normalizeLocationRow(rows[0]);
  }

  async updateLocation(
    id: string,
    input: LocationUpdateInput
  ): Promise<CommunityLocation | null> {
    const { rows: existingRows } = await this.pool.query(
      "SELECT * FROM public.community_locations WHERE id = $1",
      [id]
    );
    if (!existingRows[0]) return null;
    const merged = { ...existingRows[0], ...input };
    const continent = inferContinentFromCountryCode(
      merged.country_code,
      merged.continent
    );
    const { rows } = await this.pool.query(
      `UPDATE public.community_locations
       SET city=$2, country=$3, country_code=$4, continent=$5, latitude=$6, longitude=$7,
           member_count=$8, marker_color=$9, description=$10, is_published=$11
       WHERE id=$1
       RETURNING *`,
      [
        id,
        merged.city,
        merged.country,
        merged.country_code,
        continent,
        merged.latitude,
        merged.longitude,
        merged.member_count,
        merged.marker_color,
        merged.description,
        merged.is_published,
      ]
    );
    return rows[0] ? normalizeLocationRow(rows[0]) : null;
  }

  async deleteLocation(id: string): Promise<boolean> {
    const res = await this.pool.query(
      "DELETE FROM public.community_locations WHERE id = $1",
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listTimelineEvents(options?: {
    includeUnpublished?: boolean;
  }): Promise<TimelineEvent[]> {
    const sql = options?.includeUnpublished
      ? "SELECT * FROM public.timeline_events ORDER BY event_date ASC, sort_order ASC"
      : "SELECT * FROM public.timeline_events WHERE is_published = true ORDER BY event_date ASC, sort_order ASC";
    const { rows } = await this.pool.query(sql);
    return rows.map((row) => normalizeTimelineRow(row));
  }

  async createTimelineEvent(
    input: TimelineEventCreateInput
  ): Promise<TimelineEvent> {
    const { rows } = await this.pool.query(
      `INSERT INTO public.timeline_events
        (title, description, event_date, image_url, external_url, category, sort_order, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        input.title,
        input.description,
        input.event_date,
        input.image_url,
        input.external_url,
        input.category,
        input.sort_order,
        input.is_published,
      ]
    );
    return normalizeTimelineRow(rows[0]);
  }

  async updateTimelineEvent(
    id: string,
    input: TimelineEventUpdateInput
  ): Promise<TimelineEvent | null> {
    const { rows: existingRows } = await this.pool.query(
      "SELECT * FROM public.timeline_events WHERE id = $1",
      [id]
    );
    if (!existingRows[0]) return null;
    const normalizedExisting = normalizeTimelineRow(existingRows[0]);
    const merged = { ...normalizedExisting, ...input };
    const { rows } = await this.pool.query(
      `UPDATE public.timeline_events
       SET title=$2, description=$3, event_date=$4, image_url=$5, external_url=$6,
           category=$7, sort_order=$8, is_published=$9
       WHERE id=$1
       RETURNING *`,
      [
        id,
        merged.title,
        merged.description,
        merged.event_date,
        merged.image_url,
        merged.external_url,
        merged.category,
        merged.sort_order,
        merged.is_published,
      ]
    );
    return rows[0] ? normalizeTimelineRow(rows[0]) : null;
  }

  async deleteTimelineEvent(id: string): Promise<boolean> {
    const res = await this.pool.query(
      "DELETE FROM public.timeline_events WHERE id = $1",
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listSocialLinks(options?: {
    includeUnpublished?: boolean;
  }): Promise<SocialLink[]> {
    const sql = options?.includeUnpublished
      ? "SELECT * FROM public.social_links ORDER BY sort_order ASC"
      : "SELECT * FROM public.social_links WHERE is_published = true ORDER BY sort_order ASC";
    const { rows } = await this.pool.query(sql);
    return rows as SocialLink[];
  }

  async createSocialLink(input: SocialLinkCreateInput): Promise<SocialLink> {
    const { rows } = await this.pool.query(
      `INSERT INTO public.social_links (platform, label, url, sort_order, is_published)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        input.platform,
        input.label,
        input.url,
        input.sort_order,
        input.is_published,
      ]
    );
    return rows[0] as SocialLink;
  }

  async updateSocialLink(
    id: string,
    input: SocialLinkUpdateInput
  ): Promise<SocialLink | null> {
    const { rows: existingRows } = await this.pool.query(
      "SELECT * FROM public.social_links WHERE id = $1",
      [id]
    );
    if (!existingRows[0]) return null;
    const merged = { ...existingRows[0], ...input };
    const { rows } = await this.pool.query(
      `UPDATE public.social_links
       SET platform=$2, label=$3, url=$4, sort_order=$5, is_published=$6
       WHERE id=$1
       RETURNING *`,
      [
        id,
        merged.platform,
        merged.label,
        merged.url,
        merged.sort_order,
        merged.is_published,
      ]
    );
    return (rows[0] as SocialLink | undefined) ?? null;
  }

  async deleteSocialLink(id: string): Promise<boolean> {
    const res = await this.pool.query(
      "DELETE FROM public.social_links WHERE id = $1",
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listFeaturedVideos(options?: {
    includeUnfeatured?: boolean;
  }): Promise<FeaturedVideo[]> {
    const sql = options?.includeUnfeatured
      ? "SELECT * FROM public.featured_videos ORDER BY sort_order ASC"
      : "SELECT * FROM public.featured_videos WHERE is_featured = true AND COALESCE(is_hidden, false) = false ORDER BY sort_order ASC";
    const { rows } = await this.pool.query(sql);
    return rows.map((row) => ({
      ...row,
      is_hidden: Boolean(row.is_hidden),
    })) as FeaturedVideo[];
  }

  async upsertFeaturedVideo(
    input: FeaturedVideoCreateInput
  ): Promise<FeaturedVideo> {
    const isHidden = Boolean(input.is_hidden);
    const { rows } = await this.pool.query(
      `INSERT INTO public.featured_videos (youtube_video_id, title_override, is_featured, is_hidden, sort_order)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (youtube_video_id) DO UPDATE SET
         title_override = EXCLUDED.title_override,
         is_featured = EXCLUDED.is_featured,
         is_hidden = EXCLUDED.is_hidden,
         sort_order = EXCLUDED.sort_order
       RETURNING *`,
      [
        input.youtube_video_id,
        input.title_override,
        input.is_featured,
        isHidden,
        input.sort_order,
      ]
    );
    return {
      ...rows[0],
      is_hidden: Boolean(rows[0]?.is_hidden),
    } as FeaturedVideo;
  }

  async updateFeaturedVideo(
    id: string,
    input: FeaturedVideoUpdateInput
  ): Promise<FeaturedVideo | null> {
    const { rows: existingRows } = await this.pool.query(
      "SELECT * FROM public.featured_videos WHERE id = $1",
      [id]
    );
    if (!existingRows[0]) return null;
    const merged = {
      ...existingRows[0],
      is_hidden: Boolean(existingRows[0].is_hidden),
      ...input,
    };
    const { rows } = await this.pool.query(
      `UPDATE public.featured_videos
       SET title_override=$2, is_featured=$3, is_hidden=$4, sort_order=$5
       WHERE id=$1
       RETURNING *`,
      [
        id,
        merged.title_override,
        merged.is_featured,
        Boolean(merged.is_hidden),
        merged.sort_order,
      ]
    );
    return rows[0]
      ? ({ ...rows[0], is_hidden: Boolean(rows[0].is_hidden) } as FeaturedVideo)
      : null;
  }

  async deleteFeaturedVideo(id: string): Promise<boolean> {
    const res = await this.pool.query(
      "DELETE FROM public.featured_videos WHERE id = $1",
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async createAuditLog(input: AuditLogCreateInput): Promise<WebsiteAuditLog> {
    const { rows } = await this.pool.query(
      `INSERT INTO public.website_audit_logs (event_type, description, actor_id)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [input.event_type, input.description, input.actor_id]
    );
    return {
      ...rows[0],
      created_at: toIsoString(rows[0]?.created_at),
    } as WebsiteAuditLog;
  }

  async listAuditLogs(options?: { limit?: number }): Promise<WebsiteAuditLog[]> {
    const limit = Math.min(Math.max(options?.limit ?? 15, 1), 100);
    try {
      const { rows } = await this.pool.query(
        "SELECT * FROM public.website_audit_logs ORDER BY created_at DESC LIMIT $1",
        [limit]
      );
      return rows.map((row) => ({
        ...row,
        created_at: toIsoString(row.created_at),
      })) as WebsiteAuditLog[];
    } catch {
      return [];
    }
  }
}
