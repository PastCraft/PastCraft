import { randomUUID } from "node:crypto";
import {
  SEED_FEATURED_VIDEOS,
  SEED_HISTORY,
  SEED_LOCATIONS,
  SEED_SETTINGS,
  SEED_SOCIAL_LINKS,
} from "@/lib/data/seed";
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

interface InMemoryStore {
  settings: CommunitySettings;
  locations: CommunityLocation[];
  history: TimelineEvent[];
  socialLinks: SocialLink[];
  featuredVideos: FeaturedVideo[];
  auditLogs: WebsiteAuditLog[];
}

function createInitialStore(): InMemoryStore {
  return {
    settings: structuredClone(SEED_SETTINGS),
    locations: structuredClone(SEED_LOCATIONS),
    history: structuredClone(SEED_HISTORY),
    socialLinks: structuredClone(SEED_SOCIAL_LINKS),
    featuredVideos: structuredClone(SEED_FEATURED_VIDEOS),
    auditLogs: [],
  };
}

const globalForStore = globalThis as unknown as {
  __pastcraftFallbackStore?: InMemoryStore;
};

function getStore(): InMemoryStore {
  if (!globalForStore.__pastcraftFallbackStore) {
    globalForStore.__pastcraftFallbackStore = createInitialStore();
  }
  return globalForStore.__pastcraftFallbackStore;
}

export class FallbackCommunityRepository implements CommunityRepository {
  readonly source = "seed" as const;
  private store: InMemoryStore;

  constructor(isolated = false) {
    this.store = isolated ? createInitialStore() : getStore();
  }

  async getSettings(): Promise<CommunitySettings> {
    return structuredClone(this.store.settings);
  }

  async updateSettings(
    input: CommunitySettingsUpdateInput
  ): Promise<CommunitySettings> {
    this.store.settings = {
      ...this.store.settings,
      ...input,
      updated_at: new Date().toISOString(),
    };
    return structuredClone(this.store.settings);
  }

  async listLocations(options?: {
    includeUnpublished?: boolean;
  }): Promise<CommunityLocation[]> {
    const items = options?.includeUnpublished
      ? this.store.locations
      : this.store.locations.filter((loc) => loc.is_published);
    return structuredClone(items).sort(
      (a, b) => b.member_count - a.member_count || a.city.localeCompare(b.city)
    );
  }

  async createLocation(input: LocationCreateInput): Promise<CommunityLocation> {
    const created: CommunityLocation = {
      ...input,
      id: randomUUID(),
      continent: inferContinentFromCountryCode(
        input.country_code,
        input.continent
      ),
      created_at: new Date().toISOString(),
    };
    this.store.locations.push(created);
    return structuredClone(created);
  }

  async updateLocation(
    id: string,
    input: LocationUpdateInput
  ): Promise<CommunityLocation | null> {
    const idx = this.store.locations.findIndex((loc) => loc.id === id);
    if (idx === -1) return null;
    const current = this.store.locations[idx];
    const updatedCountryCode = input.country_code ?? current.country_code;
    const updated: CommunityLocation = {
      ...current,
      ...input,
      continent: inferContinentFromCountryCode(
        updatedCountryCode,
        input.continent ?? current.continent
      ),
    };
    this.store.locations[idx] = updated;
    return structuredClone(updated);
  }

  async deleteLocation(id: string): Promise<boolean> {
    const initialLen = this.store.locations.length;
    this.store.locations = this.store.locations.filter((loc) => loc.id !== id);
    return this.store.locations.length < initialLen;
  }

  async listTimelineEvents(options?: {
    includeUnpublished?: boolean;
  }): Promise<TimelineEvent[]> {
    const items = options?.includeUnpublished
      ? this.store.history
      : this.store.history.filter((ev) => ev.is_published);
    return structuredClone(items).sort(
      (a, b) =>
        a.event_date.localeCompare(b.event_date) || a.sort_order - b.sort_order
    );
  }

  async createTimelineEvent(
    input: TimelineEventCreateInput
  ): Promise<TimelineEvent> {
    const created: TimelineEvent = {
      ...input,
      id: randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.store.history.push(created);
    return structuredClone(created);
  }

  async updateTimelineEvent(
    id: string,
    input: TimelineEventUpdateInput
  ): Promise<TimelineEvent | null> {
    const idx = this.store.history.findIndex((ev) => ev.id === id);
    if (idx === -1) return null;
    const updated: TimelineEvent = {
      ...this.store.history[idx],
      ...input,
    };
    this.store.history[idx] = updated;
    return structuredClone(updated);
  }

  async deleteTimelineEvent(id: string): Promise<boolean> {
    const initialLen = this.store.history.length;
    this.store.history = this.store.history.filter((ev) => ev.id !== id);
    return this.store.history.length < initialLen;
  }

  async listSocialLinks(options?: {
    includeUnpublished?: boolean;
  }): Promise<SocialLink[]> {
    const items = options?.includeUnpublished
      ? this.store.socialLinks
      : this.store.socialLinks.filter((link) => link.is_published);
    return structuredClone(items).sort((a, b) => a.sort_order - b.sort_order);
  }

  async createSocialLink(input: SocialLinkCreateInput): Promise<SocialLink> {
    const created: SocialLink = {
      ...input,
      id: randomUUID(),
    };
    this.store.socialLinks.push(created);
    return structuredClone(created);
  }

  async updateSocialLink(
    id: string,
    input: SocialLinkUpdateInput
  ): Promise<SocialLink | null> {
    const idx = this.store.socialLinks.findIndex((link) => link.id === id);
    if (idx === -1) return null;
    const updated: SocialLink = {
      ...this.store.socialLinks[idx],
      ...input,
    };
    this.store.socialLinks[idx] = updated;
    return structuredClone(updated);
  }

  async deleteSocialLink(id: string): Promise<boolean> {
    const initialLen = this.store.socialLinks.length;
    this.store.socialLinks = this.store.socialLinks.filter(
      (link) => link.id !== id
    );
    return this.store.socialLinks.length < initialLen;
  }

  async listFeaturedVideos(options?: {
    includeUnfeatured?: boolean;
  }): Promise<FeaturedVideo[]> {
    const items = options?.includeUnfeatured
      ? this.store.featuredVideos
      : this.store.featuredVideos.filter((v) => v.is_featured && !v.is_hidden);
    return structuredClone(items).sort((a, b) => a.sort_order - b.sort_order);
  }

  async upsertFeaturedVideo(
    input: FeaturedVideoCreateInput
  ): Promise<FeaturedVideo> {
    const normalizedInput = {
      ...input,
      is_hidden: Boolean(input.is_hidden),
    };
    const existingIdx = this.store.featuredVideos.findIndex(
      (v) => v.youtube_video_id === normalizedInput.youtube_video_id
    );
    if (existingIdx !== -1) {
      const updated: FeaturedVideo = {
        ...this.store.featuredVideos[existingIdx],
        ...normalizedInput,
      };
      this.store.featuredVideos[existingIdx] = updated;
      return structuredClone(updated);
    }
    const created: FeaturedVideo = {
      ...normalizedInput,
      id: randomUUID(),
    };
    this.store.featuredVideos.push(created);
    return structuredClone(created);
  }

  async updateFeaturedVideo(
    id: string,
    input: FeaturedVideoUpdateInput
  ): Promise<FeaturedVideo | null> {
    const idx = this.store.featuredVideos.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    const updated: FeaturedVideo = {
      ...this.store.featuredVideos[idx],
      ...input,
    };
    this.store.featuredVideos[idx] = updated;
    return structuredClone(updated);
  }

  async deleteFeaturedVideo(id: string): Promise<boolean> {
    const initialLen = this.store.featuredVideos.length;
    this.store.featuredVideos = this.store.featuredVideos.filter(
      (v) => v.id !== id
    );
    return this.store.featuredVideos.length < initialLen;
  }

  async createAuditLog(input: AuditLogCreateInput): Promise<WebsiteAuditLog> {
    const created: WebsiteAuditLog = {
      ...input,
      id: randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.store.auditLogs.unshift(created);
    if (this.store.auditLogs.length > 200) {
      this.store.auditLogs.length = 200;
    }
    return structuredClone(created);
  }

  async listAuditLogs(options?: { limit?: number }): Promise<WebsiteAuditLog[]> {
    const limit = Math.min(Math.max(options?.limit ?? 15, 1), 100);
    return structuredClone(this.store.auditLogs.slice(0, limit));
  }
}
