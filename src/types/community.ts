export type GlobeTexturePreset = "deep-ocean" | "night-lights" | "blue-marble";
export type StarDensityPreset = "minimal" | "balanced" | "dense";
export type AdminRole = "owner" | "admin" | "editor";

export const TIMELINE_CATEGORIES = [
  "Foundation",
  "Server development",
  "Minecraft server milestones",
  "Community events",
  "Achievements",
  "Community expansion",
  "Important announcements",
] as const;

export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number] | (string & {});

export type SocialPlatform =
  | "discord"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "x"
  | "github"
  | "twitch"
  | "reddit"
  | "website"
  | (string & {});

export interface CommunitySettings {
  id: string;
  community_name: string;
  tagline: string;
  hero_heading: string;
  description: string;
  mission: string;
  founded_at: string | null;
  logo_url: string | null;
  discord_url: string | null;
  youtube_channel_id: string | null;
  globe_texture: GlobeTexturePreset;
  show_arcs: boolean;
  star_density: StarDensityPreset;
  updated_at: string;
}

export interface CommunityLocation {
  id: string;
  city: string;
  country: string;
  country_code: string;
  continent: string;
  latitude: number;
  longitude: number;
  member_count: number;
  marker_color: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  image_url: string | null;
  external_url: string | null;
  category: TimelineCategory | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  sort_order: number;
  is_published: boolean;
}

export interface FeaturedVideo {
  id: string;
  youtube_video_id: string;
  title_override: string | null;
  is_featured: boolean;
  is_hidden: boolean;
  sort_order: number;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email?: string;
  role: AdminRole;
  created_at: string;
}

export interface WebsiteAuditLog {
  id: string;
  event_type: string;
  description: string;
  actor_id: string | null;
  created_at: string;
}

export interface DiscordWidgetSummary {
  name: string;
  available: boolean;
  status: "online" | "unavailable" | "unconfigured";
  serverName: string;
  presenceCount: number | null;
  inviteUrl: string;
  cachedAt: string;
}

export interface CommunityStatistics {
  totalMembers: number;
  countriesRepresented: number;
  continentsRepresented: number;
  communityMilestones: number;
  publishedLocations: number;
}

export interface GlobeArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
  label: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelTitle: string;
  youtubeUrl: string;
  isFeatured: boolean;
  isHidden?: boolean;
  sortOrder: number | null;
}

export interface YouTubeFeedResult {
  videos: YouTubeVideo[];
  status: "ok" | "unconfigured" | "error";
  message?: string;
  source?: "playlist" | "channel" | null;
  channelId?: string | null;
  cachedAt: string;
}

export interface PublicCommunityPayload {
  settings: CommunitySettings;
  statistics: CommunityStatistics;
  locations: CommunityLocation[];
  history: TimelineEvent[];
  socialLinks: SocialLink[];
  dataSource: "supabase" | "postgres" | "seed";
}
