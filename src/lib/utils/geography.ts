import type {
  CommunityLocation,
  CommunityStatistics,
  GlobeArc,
  TimelineEvent,
} from "@/types/community";

const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // Europe
  GB: "Europe",
  DE: "Europe",
  FR: "Europe",
  ES: "Europe",
  IT: "Europe",
  NL: "Europe",
  SE: "Europe",
  NO: "Europe",
  FI: "Europe",
  DK: "Europe",
  PL: "Europe",
  CH: "Europe",
  AT: "Europe",
  BE: "Europe",
  IE: "Europe",
  PT: "Europe",
  CZ: "Europe",
  RO: "Europe",
  GR: "Europe",
  UA: "Europe",
  // North America
  US: "North America",
  CA: "North America",
  MX: "North America",
  CR: "North America",
  PA: "North America",
  // South America
  BR: "South America",
  AR: "South America",
  CL: "South America",
  CO: "South America",
  PE: "South America",
  UY: "South America",
  // Asia
  JP: "Asia",
  KR: "Asia",
  SG: "Asia",
  IN: "Asia",
  ID: "Asia",
  MY: "Asia",
  PH: "Asia",
  TH: "Asia",
  VN: "Asia",
  TW: "Asia",
  HK: "Asia",
  CN: "Asia",
  AE: "Asia",
  SA: "Asia",
  IL: "Asia",
  TR: "Asia",
  // Oceania
  AU: "Oceania",
  NZ: "Oceania",
  FJ: "Oceania",
  // Africa
  KE: "Africa",
  EG: "Africa",
  ZA: "Africa",
  NG: "Africa",
  GH: "Africa",
  MA: "Africa",
  TN: "Africa",
  ET: "Africa",
};

export const CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
] as const;

export function inferContinentFromCountryCode(
  countryCode: string,
  explicitContinent?: string | null
): string {
  if (explicitContinent && explicitContinent.trim() && explicitContinent !== "Other") {
    return explicitContinent.trim();
  }
  const normalized = countryCode.trim().toUpperCase();
  return COUNTRY_TO_CONTINENT[normalized] ?? "Other";
}

/**
 * Computes community statistics strictly from real configured records.
 * Never invents or fabricates numbers.
 */
export function computeCommunityStatistics(
  locations: CommunityLocation[],
  timelineEvents: TimelineEvent[]
): CommunityStatistics {
  const publishedLocations = locations.filter((loc) => loc.is_published);
  const publishedEvents = timelineEvents.filter((ev) => ev.is_published);

  const totalMembers = publishedLocations.reduce(
    (sum, loc) => sum + Math.max(0, loc.member_count),
    0
  );

  const countriesSet = new Set(
    publishedLocations.map((loc) =>
      (loc.country_code || loc.country).trim().toUpperCase()
    )
  );

  const continentsSet = new Set(
    publishedLocations
      .map((loc) => inferContinentFromCountryCode(loc.country_code, loc.continent))
      .filter((continent) => continent !== "Other")
  );

  return {
    totalMembers,
    countriesRepresented: countriesSet.size,
    continentsRepresented: continentsSet.size,
    communityMilestones: publishedEvents.length,
    publishedLocations: publishedLocations.length,
  };
}

/**
 * Generates restrained, visually balanced geodesic connection arcs between major hubs.
 */
export function buildConnectionArcs(locations: CommunityLocation[]): GlobeArc[] {
  const published = locations.filter((loc) => loc.is_published);
  if (published.length < 2) {
    return [];
  }

  const sorted = [...published].sort((a, b) => b.member_count - a.member_count);
  const arcs: GlobeArc[] = [];
  const maxArcs = Math.min(14, sorted.length);

  for (let i = 0; i < maxArcs; i++) {
    const source = sorted[i];
    const target = sorted[(i + 1) % maxArcs];
    if (source.id === target.id) continue;

    arcs.push({
      id: `${source.id}-${target.id}`,
      startLat: source.latitude,
      startLng: source.longitude,
      endLat: target.latitude,
      endLng: target.longitude,
      color: ["rgba(56, 189, 248, 0.55)", "rgba(125, 211, 252, 0.18)"],
      label: `${source.city} ↔ ${target.city}`,
    });

    // Cross-continent bridge from top hubs for global mesh feel
    if (i < 4 && sorted.length > i + 4) {
      const bridgeTarget = sorted[i + 4];
      arcs.push({
        id: `${source.id}-bridge-${bridgeTarget.id}`,
        startLat: source.latitude,
        startLng: source.longitude,
        endLat: bridgeTarget.latitude,
        endLng: bridgeTarget.longitude,
        color: ["rgba(96, 165, 250, 0.42)", "rgba(56, 189, 248, 0.12)"],
        label: `${source.city} ↔ ${bridgeTarget.city}`,
      });
    }
  }

  return arcs;
}

/**
 * Formats city-level coordinates cleanly without exposing high-precision personal GPS data.
 */
export function formatCityCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? "N" : "S";
  const lngDir = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(1)}° ${latDir}, ${Math.abs(longitude).toFixed(1)}° ${lngDir}`;
}
