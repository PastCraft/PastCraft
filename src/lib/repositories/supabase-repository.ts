import type { SupabaseClient } from "@supabase/supabase-js";
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

export class SupabaseCommunityRepository implements CommunityRepository {
  readonly source = "supabase" as const;

  constructor(private readonly client: SupabaseClient) {}

  async getSettings(): Promise<CommunitySettings> {
    const { data, error } = await this.client
      .from("community_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return structuredClone(SEED_SETTINGS);
    }

    return {
      ...SEED_SETTINGS,
      ...data,
    } as CommunitySettings;
  }

  async updateSettings(
    input: CommunitySettingsUpdateInput
  ): Promise<CommunitySettings> {
    const existing = await this.getSettings();
    const payload = {
      id: existing.id,
      community_name: input.community_name ?? existing.community_name,
      tagline: input.tagline ?? existing.tagline,
      hero_heading: input.hero_heading ?? existing.hero_heading,
      description: input.description ?? existing.description,
      mission: input.mission ?? existing.mission,
      founded_at:
        input.founded_at !== undefined ? input.founded_at : existing.founded_at,
      logo_url: input.logo_url !== undefined ? input.logo_url : existing.logo_url,
      discord_url:
        input.discord_url !== undefined ? input.discord_url : existing.discord_url,
      youtube_channel_id:
        input.youtube_channel_id !== undefined
          ? input.youtube_channel_id
          : existing.youtube_channel_id,
      globe_texture: input.globe_texture ?? existing.globe_texture,
      show_arcs: input.show_arcs ?? existing.show_arcs,
      star_density: input.star_density ?? existing.star_density,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from("community_settings")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update settings: ${error.message}`);
    }

    return data as CommunitySettings;
  }

  async listLocations(options?: {
    includeUnpublished?: boolean;
  }): Promise<CommunityLocation[]> {
    let query = this.client
      .from("community_locations")
      .select("*")
      .order("member_count", { ascending: false })
      .order("city", { ascending: true });

    if (!options?.includeUnpublished) {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      ...row,
      continent: inferContinentFromCountryCode(row.country_code, row.continent),
    })) as CommunityLocation[];
  }

  async createLocation(input: LocationCreateInput): Promise<CommunityLocation> {
    const payload = {
      ...input,
      continent: inferContinentFromCountryCode(
        input.country_code,
        input.continent
      ),
    };
    const { data, error } = await this.client
      .from("community_locations")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create location: ${error.message}`);
    }

    return data as CommunityLocation;
  }

  async updateLocation(
    id: string,
    input: LocationUpdateInput
  ): Promise<CommunityLocation | null> {
    const payload: Record<string, unknown> = { ...input };
    if (input.country_code) {
      payload.continent = inferContinentFromCountryCode(
        input.country_code,
        input.continent
      );
    }
    const { data, error } = await this.client
      .from("community_locations")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update location: ${error.message}`);
    }

    return (data as CommunityLocation | null) ?? null;
  }

  async deleteLocation(id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("community_locations")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete location: ${error.message}`);
    }

    return (count ?? 1) > 0;
  }

  async listTimelineEvents(options?: {
    includeUnpublished?: boolean;
  }): Promise<TimelineEvent[]> {
    let query = this.client
      .from("timeline_events")
      .select("*")
      .order("event_date", { ascending: true })
      .order("sort_order", { ascending: true });

    if (!options?.includeUnpublished) {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data as TimelineEvent[];
  }

  async createTimelineEvent(
    input: TimelineEventCreateInput
  ): Promise<TimelineEvent> {
    const { data, error } = await this.client
      .from("timeline_events")
      .insert(input)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create timeline event: ${error.message}`);
    }

    return data as TimelineEvent;
  }

  async updateTimelineEvent(
    id: string,
    input: TimelineEventUpdateInput
  ): Promise<TimelineEvent | null> {
    const { data, error } = await this.client
      .from("timeline_events")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update timeline event: ${error.message}`);
    }

    return (data as TimelineEvent | null) ?? null;
  }

  async deleteTimelineEvent(id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("timeline_events")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete timeline event: ${error.message}`);
    }

    return (count ?? 1) > 0;
  }

  async listSocialLinks(options?: {
    includeUnpublished?: boolean;
  }): Promise<SocialLink[]> {
    let query = this.client
      .from("social_links")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!options?.includeUnpublished) {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data as SocialLink[];
  }

  async createSocialLink(input: SocialLinkCreateInput): Promise<SocialLink> {
    const { data, error } = await this.client
      .from("social_links")
      .insert(input)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create social link: ${error.message}`);
    }

    return data as SocialLink;
  }

  async updateSocialLink(
    id: string,
    input: SocialLinkUpdateInput
  ): Promise<SocialLink | null> {
    const { data, error } = await this.client
      .from("social_links")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update social link: ${error.message}`);
    }

    return (data as SocialLink | null) ?? null;
  }

  async deleteSocialLink(id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("social_links")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete social link: ${error.message}`);
    }

    return (count ?? 1) > 0;
  }

  async listFeaturedVideos(options?: {
    includeUnfeatured?: boolean;
  }): Promise<FeaturedVideo[]> {
    let query = this.client
      .from("featured_videos")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!options?.includeUnfeatured) {
      query = query.eq("is_featured", true);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    const normalized = data.map((row) => ({
      ...row,
      is_hidden: Boolean((row as Partial<FeaturedVideo>).is_hidden),
    })) as FeaturedVideo[];

    return options?.includeUnfeatured
      ? normalized
      : normalized.filter((item) => !item.is_hidden);
  }

  async upsertFeaturedVideo(
    input: FeaturedVideoCreateInput
  ): Promise<FeaturedVideo> {
    const payload = {
      ...input,
      is_hidden: Boolean(input.is_hidden),
    };
    const { data, error } = await this.client
      .from("featured_videos")
      .upsert(payload, { onConflict: "youtube_video_id" })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to save featured video: ${error.message}`);
    }

    return {
      ...data,
      is_hidden: Boolean((data as Partial<FeaturedVideo>).is_hidden),
    } as FeaturedVideo;
  }

  async updateFeaturedVideo(
    id: string,
    input: FeaturedVideoUpdateInput
  ): Promise<FeaturedVideo | null> {
    const { data, error } = await this.client
      .from("featured_videos")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update featured video: ${error.message}`);
    }

    if (!data) return null;
    return {
      ...data,
      is_hidden: Boolean((data as Partial<FeaturedVideo>).is_hidden),
    } as FeaturedVideo;
  }

  async deleteFeaturedVideo(id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("featured_videos")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete featured video: ${error.message}`);
    }

    return (count ?? 1) > 0;
  }

  async createAuditLog(input: AuditLogCreateInput): Promise<WebsiteAuditLog> {
    const { data, error } = await this.client
      .from("website_audit_logs")
      .insert(input)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create audit log: ${error.message}`);
    }

    return data as WebsiteAuditLog;
  }

  async listAuditLogs(options?: { limit?: number }): Promise<WebsiteAuditLog[]> {
    const limit = Math.min(Math.max(options?.limit ?? 15, 1), 100);
    const { data, error } = await this.client
      .from("website_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data as WebsiteAuditLog[];
  }
}
