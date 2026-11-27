import { createClient } from "@supabase/supabase-js";
import {
  getDirectDatabaseUrl,
  getPublicSupabaseConfig,
  resolveDiscordInviteUrl,
} from "@/lib/env";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { computeCommunityStatistics } from "@/lib/utils/geography";
import type { PublicCommunityPayload } from "@/types/community";
import { FallbackCommunityRepository } from "./fallback-repository";
import { PostgresCommunityRepository } from "./postgres-repository";
import { SupabaseCommunityRepository } from "./supabase-repository";
import type { CommunityRepository } from "./types";

let repositoryOverride: CommunityRepository | null = null;

/**
 * Allows injecting an isolated repository during automated testing.
 */
export function setRepositoryOverride(repo: CommunityRepository | null) {
  repositoryOverride = repo;
}

/**
 * Resolves the public read-only repository.
 * Priority: Test Override -> Supabase (anon/RLS) -> Self-hosted Postgres -> Seed Fallback
 */
export async function getPublicRepository(): Promise<CommunityRepository> {
  if (repositoryOverride) {
    return repositoryOverride;
  }

  const supabaseConfig = getPublicSupabaseConfig();
  if (supabaseConfig) {
    const anonClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return new SupabaseCommunityRepository(anonClient);
  }

  const dbUrl = getDirectDatabaseUrl();
  if (dbUrl) {
    return new PostgresCommunityRepository(dbUrl);
  }

  return new FallbackCommunityRepository();
}

/**
 * Resolves the privileged repository for verified admin mutations.
 * Uses Service Role client if configured, otherwise falls back to the authenticated SSR client (enforcing RLS).
 */
export async function getAdminRepository(): Promise<CommunityRepository> {
  if (repositoryOverride) {
    return repositoryOverride;
  }

  const serviceClient = createSupabaseServiceClient();
  if (serviceClient) {
    return new SupabaseCommunityRepository(serviceClient);
  }

  const serverClient = await createSupabaseServerClient();
  if (serverClient) {
    return new SupabaseCommunityRepository(serverClient);
  }

  const dbUrl = getDirectDatabaseUrl();
  if (dbUrl) {
    return new PostgresCommunityRepository(dbUrl);
  }

  return new FallbackCommunityRepository();
}

/**
 * Loads all public community data safely, falling back gracefully to seed data
 * if an upstream database is temporarily unreachable or empty on first boot.
 */
export async function loadPublicCommunityData(): Promise<PublicCommunityPayload> {
  const repo = await getPublicRepository();

  try {
    const [settings, locations, history, socialLinks] = await Promise.all([
      repo.getSettings(),
      repo.listLocations({ includeUnpublished: false }),
      repo.listTimelineEvents({ includeUnpublished: false }),
      repo.listSocialLinks({ includeUnpublished: false }),
    ]);

    const normalizedSettings = {
      ...settings,
      discord_url: resolveDiscordInviteUrl(settings.discord_url),
    };
    const statistics = computeCommunityStatistics(locations, history);

    return {
      settings: normalizedSettings,
      statistics,
      locations,
      history,
      socialLinks,
      dataSource: repo.source,
    };
  } catch {
    const fallback = new FallbackCommunityRepository();
    const [settings, locations, history, socialLinks] = await Promise.all([
      fallback.getSettings(),
      fallback.listLocations({ includeUnpublished: false }),
      fallback.listTimelineEvents({ includeUnpublished: false }),
      fallback.listSocialLinks({ includeUnpublished: false }),
    ]);

    return {
      settings: {
        ...settings,
        discord_url: resolveDiscordInviteUrl(settings.discord_url),
      },
      statistics: computeCommunityStatistics(locations, history),
      locations,
      history,
      socialLinks,
      dataSource: "seed",
    };
  }
}
