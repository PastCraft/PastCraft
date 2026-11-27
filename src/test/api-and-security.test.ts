// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as getPublicCommunity } from "@/app/api/community/route";
import { GET as getPublicLocations } from "@/app/api/locations/route";
import { GET as getPublicHistory } from "@/app/api/history/route";
import { GET as getPublicSocial } from "@/app/api/social-links/route";
import {
  DELETE as deleteAdminLocation,
  GET as getAdminLocations,
  PATCH as patchAdminLocation,
  POST as postAdminLocation,
} from "@/app/api/admin/locations/route";
import {
  POST as postAdminHistory,
  PATCH as patchAdminHistory,
} from "@/app/api/admin/history/route";
import { POST as postAdminSocial } from "@/app/api/admin/social-links/route";
import { PATCH as patchAdminSettings } from "@/app/api/admin/settings/route";
import { POST as postAdminUpload } from "@/app/api/admin/upload/route";
import { requireAdminApi, setAdminVerifierOverride } from "@/lib/auth/admin";
import { clearRateLimits } from "@/lib/auth/rate-limit";
import { FallbackCommunityRepository } from "@/lib/repositories/fallback-repository";
import { setRepositoryOverride } from "@/lib/repositories";

describe("Public & Protected Admin API Routes", () => {
  let isolatedRepo: FallbackCommunityRepository;

  beforeEach(() => {
    isolatedRepo = new FallbackCommunityRepository(true);
    setRepositoryOverride(isolatedRepo);
    setAdminVerifierOverride(null);
    clearRateLimits();
  });

  afterEach(() => {
    setRepositoryOverride(null);
    setAdminVerifierOverride(null);
    clearRateLimits();
  });

  it("serves public endpoints gracefully when external env vars are missing", async () => {
    const [communityRes, locRes, histRes, socRes] = await Promise.all([
      getPublicCommunity(),
      getPublicLocations(),
      getPublicHistory(),
      getPublicSocial(),
    ]);

    expect(communityRes.status).toBe(200);
    const communityJson = await communityRes.json();
    expect(communityJson.settings.community_name).toBe("PastCraft");
    expect(communityJson.statistics.totalMembers).toBeGreaterThan(0);

    expect(locRes.status).toBe(200);
    const locJson = await locRes.json();
    expect(locJson.locations.length).toBeGreaterThan(0);

    expect(histRes.status).toBe(200);
    const histJson = await histRes.json();
    const dates = histJson.history.map((h: { event_date: string }) => h.event_date);
    expect(dates).toEqual([...dates].sort());

    expect(socRes.status).toBe(200);
  });

  it("blocks unauthenticated visitors (401) from all admin endpoints", async () => {
    setAdminVerifierOverride(async () => ({
      authorized: false,
      status: 401,
      reason: "Authentication required.",
    }));

    const getRes = await getAdminLocations();
    expect(getRes.status).toBe(401);

    const postLocRes = await postAdminLocation(
      new Request("http://localhost:3000/api/admin/locations", {
        method: "POST",
        body: JSON.stringify({
          city: "Dublin",
          country: "Ireland",
          country_code: "IE",
          latitude: 53.3498,
          longitude: -6.2603,
          member_count: 25,
        }),
      })
    );
    expect(postLocRes.status).toBe(401);

    const patchSettingsRes = await patchAdminSettings(
      new Request("http://localhost:3000/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ community_name: "Hijacked" }),
      })
    );
    expect(patchSettingsRes.status).toBe(401);

    const uploadForm = new FormData();
    uploadForm.append(
      "file",
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "test.png", {
        type: "image/png",
      })
    );
    const uploadRes = await postAdminUpload(
      new Request("http://localhost:3000/api/admin/upload", {
        method: "POST",
        body: uploadForm,
      })
    );
    expect(uploadRes.status).toBe(401);
  });

  it("blocks authenticated non-admin users (403) from admin mutations", async () => {
    setAdminVerifierOverride(async () => ({
      authorized: false,
      status: 403,
      reason: "Forbidden: your account does not have administrator permissions.",
    }));

    const res = await postAdminSocial(
      new Request("http://localhost:3000/api/admin/social-links", {
        method: "POST",
        body: JSON.stringify({
          platform: "github",
          label: "GitHub",
          url: "https://github.com/example",
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("allows verified administrators to create, hide, update, and delete content", async () => {
    setAdminVerifierOverride(async () => ({
      authorized: true,
      admin: {
        userId: "00000000-0000-0000-0000-000000000099",
        email: "admin@pastcraft.org",
        role: "owner",
      },
    }));

    const createRes = await postAdminLocation(
      new Request("http://localhost:3000/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: "Lisbon",
          country: "Portugal",
          country_code: "PT",
          latitude: 38.7223,
          longitude: -9.1393,
          member_count: 42,
          marker_color: "#38bdf8",
          is_published: false,
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const { location: createdLoc } = await createRes.json();
    expect(createdLoc.city).toBe("Lisbon");
    expect(createdLoc.continent).toBe("Europe");

    const pubBefore = await (await getPublicLocations()).json();
    expect(
      pubBefore.locations.some((l: { id: string }) => l.id === createdLoc.id)
    ).toBe(false);

    const patchRes = await patchAdminLocation(
      new Request("http://localhost:3000/api/admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: createdLoc.id, is_published: true }),
      })
    );
    expect(patchRes.status).toBe(200);

    const pubAfter = await (await getPublicLocations()).json();
    expect(
      pubAfter.locations.some((l: { id: string }) => l.id === createdLoc.id)
    ).toBe(true);

    const delRes = await deleteAdminLocation(
      new Request(
        `http://localhost:3000/api/admin/locations?id=${createdLoc.id}`,
        { method: "DELETE" }
      )
    );
    expect(delRes.status).toBe(200);

    const histCreateRes = await postAdminHistory(
      new Request("http://localhost:3000/api/admin/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Season 2 Server Upgrade",
          description: "Migrated PastCraft world to high-memory hardware.",
          event_date: "2026-05-20",
          category: "Minecraft server milestones",
          sort_order: 10,
          is_published: true,
        }),
      })
    );
    expect(histCreateRes.status).toBe(201);
    const { event: createdEvent } = await histCreateRes.json();
    expect(createdEvent.category).toBe("Minecraft server milestones");

    const histPatchRes = await patchAdminHistory(
      new Request("http://localhost:3000/api/admin/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: createdEvent.id,
          title: "Season 2 Annual Summit",
          category: null,
        }),
      })
    );
    expect(histPatchRes.status).toBe(200);
    const patchedEventJson = await histPatchRes.json();
    expect(patchedEventJson.event.title).toBe("Season 2 Annual Summit");
    expect(patchedEventJson.event.category).toBeNull();
  });

  it("rejects spoofed image uploads and handles unconfigured storage gracefully", async () => {
    setAdminVerifierOverride(async () => ({
      authorized: true,
      admin: {
        userId: "00000000-0000-0000-0000-000000000099",
        email: "admin@pastcraft.org",
        role: "owner",
      },
    }));

    const spoofedForm = new FormData();
    spoofedForm.append(
      "file",
      new File(["<script>alert(1)</script>"], "evil.png", {
        type: "image/png",
      })
    );
    const spoofRes = await postAdminUpload(
      new Request("http://localhost:3000/api/admin/upload", {
        method: "POST",
        body: spoofedForm,
      })
    );
    expect(spoofRes.status).toBe(400);

    // Valid PNG header, but Supabase storage is unconfigured in local env
    const validPngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const validForm = new FormData();
    validForm.append(
      "file",
      new File([validPngBytes], "milestone.png", { type: "image/png" })
    );
    const unconfiguredRes = await postAdminUpload(
      new Request("http://localhost:3000/api/admin/upload", {
        method: "POST",
        body: validForm,
      })
    );
    expect(unconfiguredRes.status).toBe(503);
  });

  it("enforces sliding-window rate limits on administrative upload requests", async () => {
    setAdminVerifierOverride(async () => ({
      authorized: true,
      admin: {
        userId: "00000000-0000-0000-0000-000000000099",
        email: "admin@pastcraft.org",
        role: "owner",
      },
    }));

    for (let i = 0; i < 20; i++) {
      const check = await requireAdminApi({ scope: "upload" });
      expect(check.ok).toBe(true);
    }

    const throttled = await requireAdminApi({ scope: "upload" });
    expect(throttled.ok).toBe(false);
    if (!throttled.ok) {
      expect(throttled.response.status).toBe(429);
      expect(throttled.response.headers.get("Retry-After")).toBeTruthy();
    }
  });
});
