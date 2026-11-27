// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detectImageSignature } from "@/app/api/admin/upload/route";
import { SEED_HISTORY, SEED_LOCATIONS } from "@/lib/data/seed";
import {
  buildConnectionArcs,
  computeCommunityStatistics,
  formatCityCoordinates,
  inferContinentFromCountryCode,
} from "@/lib/utils/geography";
import {
  extractYouTubeVideoId,
  featuredVideoCreateSchema,
  locationCreateSchema,
  locationUpdateSchema,
  socialLinkCreateSchema,
  timelineEventCreateSchema,
} from "@/lib/validation/schemas";

describe("Geography & Statistics Utilities", () => {
  it("computes real community statistics strictly from published records", () => {
    const locations = [
      ...SEED_LOCATIONS.slice(0, 3),
      {
        ...SEED_LOCATIONS[3],
        id: "unpublished-loc",
        member_count: 9999,
        country_code: "ZZ",
        is_published: false,
      },
    ];
    const events = [
      ...SEED_HISTORY.slice(0, 2),
      {
        ...SEED_HISTORY[2],
        id: "draft-event",
        is_published: false,
      },
    ];

    const stats = computeCommunityStatistics(locations, events);
    const expectedMembers =
      SEED_LOCATIONS[0].member_count +
      SEED_LOCATIONS[1].member_count +
      SEED_LOCATIONS[2].member_count;

    expect(stats.totalMembers).toBe(expectedMembers);
    expect(stats.countriesRepresented).toBe(2);
    expect(stats.continentsRepresented).toBe(2);
    expect(stats.communityMilestones).toBe(2);
    expect(stats.publishedLocations).toBe(3);
  });

  it("infers continents accurately from ISO country codes", () => {
    expect(inferContinentFromCountryCode("jp")).toBe("Asia");
    expect(inferContinentFromCountryCode("DE")).toBe("Europe");
    expect(inferContinentFromCountryCode("BR")).toBe("South America");
    expect(inferContinentFromCountryCode("KE")).toBe("Africa");
    expect(inferContinentFromCountryCode("AU")).toBe("Oceania");
  });

  it("builds geodesic connection arcs only from published hubs", () => {
    const arcs = buildConnectionArcs(SEED_LOCATIONS);
    expect(arcs.length).toBeGreaterThan(0);
    expect(arcs[0]).toHaveProperty("startLat");
    expect(arcs[0]).toHaveProperty("endLng");
  });

  it("formats city-level coordinates without high-precision personal GPS", () => {
    expect(formatCityCoordinates(51.5074, -0.1278)).toBe("51.5° N, 0.1° W");
    expect(formatCityCoordinates(-33.8688, 151.2093)).toBe("33.9° S, 151.2° E");
  });
});

describe("Input Validation & Privacy Schemas", () => {
  it("validates and rounds location coordinates to city-safe precision", () => {
    const parsed = locationCreateSchema.parse({
      city: "Reykjavik",
      country: "Iceland",
      country_code: "is",
      latitude: 64.14658291,
      longitude: -21.94263542,
      member_count: 18,
      marker_color: "#38bdf8",
      is_published: true,
    });

    expect(parsed.country_code).toBe("IS");
    expect(parsed.latitude).toBe(64.1466);
    expect(parsed.longitude).toBe(-21.9426);
    expect(parsed.description).toBeNull();
  });

  it("preserves omitted fields on partial updates without wiping existing values", () => {
    const patch = locationUpdateSchema.parse({
      id: "loc-1",
      is_published: false,
    });
    expect(patch.description).toBeUndefined();
    expect(patch.city).toBeUndefined();
    expect(patch.is_published).toBe(false);
  });

  it("accepts optional timeline categories including Minecraft server milestones", () => {
    const withCategory = timelineEventCreateSchema.parse({
      title: "Nether Hub Opening",
      description: "Connected all four cardinal player districts.",
      event_date: "2023-01-10",
      category: "Minecraft server milestones",
    });
    expect(withCategory.category).toBe("Minecraft server milestones");

    const withoutCategory = timelineEventCreateSchema.parse({
      title: "Community Town Hall",
      description: "Open community feedback session.",
      event_date: "2023-02-14",
      category: null,
    });
    expect(withoutCategory.category).toBeNull();
  });

  it("rejects out-of-range coordinates and non-http social URLs", () => {
    expect(
      locationCreateSchema.safeParse({
        city: "Invalid",
        country: "Nowhere",
        country_code: "XX",
        latitude: 120,
        longitude: 0,
        member_count: 5,
      }).success
    ).toBe(false);

    expect(
      socialLinkCreateSchema.safeParse({
        platform: "discord",
        label: "Unsafe Link",
        url: "javascript:alert(1)",
      }).success
    ).toBe(false);
  });

  it("extracts YouTube video IDs from full watch, short, and raw ID inputs", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtu.be/M7lc1UVf-VE?t=12")).toBe(
      "M7lc1UVf-VE"
    );
    expect(
      featuredVideoCreateSchema.parse({
        youtube_video_id: "https://www.youtube.com/embed/aqz-KE-bpKQ",
      }).youtube_video_id
    ).toBe("aqz-KE-bpKQ");
  });

  it("detects valid image magic bytes and rejects invalid signatures", () => {
    expect(
      detectImageSignature(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
      )
    ).toBe("image/png");
    expect(
      detectImageSignature(
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
      )
    ).toBe("image/jpeg");
    expect(
      detectImageSignature(
        new TextEncoder().encode("<svg onload=alert(1)></svg>")
      )
    ).toBeNull();
  });
});
