import type {
  CommunityLocation,
  CommunitySettings,
  FeaturedVideo,
  SocialLink,
  TimelineEvent,
  WebsiteAuditLog,
} from "@/types/community";

export type LocationCreateInput = Omit<CommunityLocation, "id" | "created_at">;
export type LocationUpdateInput = Partial<LocationCreateInput>;

export type TimelineEventCreateInput = Omit<TimelineEvent, "id" | "created_at">;
export type TimelineEventUpdateInput = Partial<TimelineEventCreateInput>;

export type SocialLinkCreateInput = Omit<SocialLink, "id">;
export type SocialLinkUpdateInput = Partial<SocialLinkCreateInput>;

export type FeaturedVideoCreateInput = Omit<FeaturedVideo, "id" | "is_hidden"> & {
  is_hidden?: boolean;
};
export type FeaturedVideoUpdateInput = Partial<Omit<FeaturedVideo, "id" | "youtube_video_id">>;

export type AuditLogCreateInput = Omit<WebsiteAuditLog, "id" | "created_at">;

export type CommunitySettingsUpdateInput = Partial<
  Omit<CommunitySettings, "id" | "updated_at">
>;

export interface CommunityRepository {
  readonly source: "supabase" | "postgres" | "seed";

  // Settings
  getSettings(): Promise<CommunitySettings>;
  updateSettings(input: CommunitySettingsUpdateInput): Promise<CommunitySettings>;

  // Locations
  listLocations(options?: { includeUnpublished?: boolean }): Promise<CommunityLocation[]>;
  createLocation(input: LocationCreateInput): Promise<CommunityLocation>;
  updateLocation(id: string, input: LocationUpdateInput): Promise<CommunityLocation | null>;
  deleteLocation(id: string): Promise<boolean>;

  // History / Timeline
  listTimelineEvents(options?: { includeUnpublished?: boolean }): Promise<TimelineEvent[]>;
  createTimelineEvent(input: TimelineEventCreateInput): Promise<TimelineEvent>;
  updateTimelineEvent(
    id: string,
    input: TimelineEventUpdateInput
  ): Promise<TimelineEvent | null>;
  deleteTimelineEvent(id: string): Promise<boolean>;

  // Social Links
  listSocialLinks(options?: { includeUnpublished?: boolean }): Promise<SocialLink[]>;
  createSocialLink(input: SocialLinkCreateInput): Promise<SocialLink>;
  updateSocialLink(id: string, input: SocialLinkUpdateInput): Promise<SocialLink | null>;
  deleteSocialLink(id: string): Promise<boolean>;

  // Featured & Moderated Videos
  listFeaturedVideos(options?: { includeUnfeatured?: boolean }): Promise<FeaturedVideo[]>;
  upsertFeaturedVideo(input: FeaturedVideoCreateInput): Promise<FeaturedVideo>;
  updateFeaturedVideo(
    id: string,
    input: FeaturedVideoUpdateInput
  ): Promise<FeaturedVideo | null>;
  deleteFeaturedVideo(id: string): Promise<boolean>;

  // Administrative Audit Logs
  createAuditLog(input: AuditLogCreateInput): Promise<WebsiteAuditLog>;
  listAuditLogs(options?: { limit?: number }): Promise<WebsiteAuditLog[]>;
}
