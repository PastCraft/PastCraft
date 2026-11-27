import { act, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PastCraftExperience } from "@/components/public/PastCraftExperience";
import {
  SEED_HISTORY,
  SEED_LOCATIONS,
  SEED_SETTINGS,
  SEED_SOCIAL_LINKS,
} from "@/lib/data/seed";
import { formatNumber } from "@/lib/utils/format";
import { computeCommunityStatistics } from "@/lib/utils/geography";
import type {
  DiscordWidgetSummary,
  PublicCommunityPayload,
  YouTubeFeedResult,
} from "@/types/community";

vi.mock("react-globe.gl", () => ({
  default: () => <div data-testid="mocked-react-globe" />,
}));

function buildMockPayload(
  dataSource: "seed" | "supabase" = "seed"
): PublicCommunityPayload {
  return {
    settings: SEED_SETTINGS,
    statistics: computeCommunityStatistics(SEED_LOCATIONS, SEED_HISTORY),
    locations: SEED_LOCATIONS,
    history: [SEED_HISTORY[3], SEED_HISTORY[0], SEED_HISTORY[1]],
    socialLinks: SEED_SOCIAL_LINKS,
    dataSource,
  };
}

const emptyYouTubeFeed: YouTubeFeedResult = {
  videos: [],
  status: "unconfigured",
  message: "YouTube credentials not yet configured.",
  cachedAt: "2026-09-14T12:00:00.000Z",
};

const populatedYouTubeFeed: YouTubeFeedResult = {
  videos: [
    {
      videoId: "feat1234567",
      title: "Featured PastCraft Relay",
      description: "Global broadcast recap.",
      thumbnailUrl: "https://i.ytimg.com/vi/feat1234567/hqdefault.jpg",
      publishedAt: "2026-08-01T00:00:00Z",
      channelTitle: "PastCraft",
      youtubeUrl: "https://www.youtube.com/watch?v=feat1234567",
      isFeatured: true,
      sortOrder: 1,
    },
    {
      videoId: "norm7654321",
      title: "Latest Town Hall",
      description: "Monthly recap.",
      thumbnailUrl: "https://i.ytimg.com/vi/norm7654321/hqdefault.jpg",
      publishedAt: "2026-09-01T00:00:00Z",
      channelTitle: "PastCraft",
      youtubeUrl: "https://www.youtube.com/watch?v=norm7654321",
      isFeatured: false,
      sortOrder: null,
    },
  ],
  status: "ok",
  cachedAt: "2026-09-14T12:00:00.000Z",
};

describe("PastCraftExperience Public UI", () => {
  it("renders persistent starfield, hero globe layer, demo badge, Discord links, chronological history, and zero admin links", () => {
    const payload = buildMockPayload("seed");
    render(
      <PastCraftExperience
        community={payload}
        youtubeFeed={emptyYouTubeFeed}
      />
    );

    expect(screen.getByTestId("persistent-starfield")).toBeInTheDocument();
    expect(screen.getByTestId("hero-globe-backdrop")).toBeInTheDocument();
    expect(screen.getByTestId("demo-mode-badge")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "A World Without Borders." })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Explore PastCraft/i })
    ).toBeInTheDocument();

    const discordLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === SEED_SETTINGS.discord_url);
    expect(discordLinks.length).toBeGreaterThanOrEqual(2);

    const firstMilestone = screen.getByText("PastCraft First Signal");
    const fourthMilestone = screen.getByText("First 24-Hour Global Relay");
    expect(
      firstMilestone.compareDocumentPosition(fourthMilestone) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    expect(screen.getByTestId("youtube-empty-state")).toBeInTheDocument();

    // Public UI must never expose /admin controls
    const allHrefs = screen
      .getAllByRole("link")
      .map((el) => el.getAttribute("href") ?? "");
    expect(allHrefs.some((href) => href.startsWith("/admin"))).toBe(false);
  });

  it("omits demo mode banner when connected to live database and plays embedded YouTube videos", () => {
    render(
      <PastCraftExperience
        community={buildMockPayload("supabase")}
        youtubeFeed={populatedYouTubeFeed}
      />
    );

    expect(screen.queryByTestId("demo-mode-badge")).toBeNull();
    expect(screen.getByText("Featured Broadcast")).toBeInTheDocument();
    expect(screen.getAllByText("Featured PastCraft Relay")).toHaveLength(1);
    expect(screen.getByText("Latest Town Hall")).toBeInTheDocument();

    // Open embedded YouTube modal player
    fireEvent.click(
      screen.getByRole("button", {
        name: "Play featured video Featured PastCraft Relay",
      })
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close video player" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("filters accessible locations by continent and inspects selected hubs", () => {
    const payload = buildMockPayload("seed");
    render(
      <PastCraftExperience
        community={payload}
        youtubeFeed={emptyYouTubeFeed}
      />
    );

    const oceaniaBtn = screen.getByRole("button", { name: "Oceania" });
    fireEvent.click(oceaniaBtn);

    const sydneyBtn = screen.getByRole("button", { name: /Sydney/i });
    expect(sydneyBtn).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /London/i })).toBeNull();

    fireEvent.click(sydneyBtn);
    expect(
      screen.getByText(/Oceania chapter kicking off every global weekend/i)
    ).toBeInTheDocument();
  });

  it("renders static WebGL fallback gracefully when WebGL is unavailable", () => {
    const payload = buildMockPayload("seed");
    render(
      <PastCraftExperience
        community={payload}
        youtubeFeed={emptyYouTubeFeed}
      />
    );

    // In jsdom, canvas.getContext("webgl") returns null so fallback UI renders safely without crashing
    expect(screen.getByTestId("starfield-fallback")).toBeInTheDocument();
  });

  it("formats member counts deterministically across SSR and client hydration", async () => {
    expect(formatNumber(1524)).toBe("1,524");
    expect(formatNumber(0)).toBe("0");

    const payload = buildMockPayload("seed");
    const largePayload: PublicCommunityPayload = {
      ...payload,
      locations: payload.locations.map((loc, index) =>
        index === 0 ? { ...loc, member_count: 1524 } : loc
      ),
      statistics: {
        ...payload.statistics,
        totalMembers: 2900,
      },
    };

    const originalToLocaleString = Number.prototype.toLocaleString;
    // Simulate a server locale (e.g. id-ID) vs client locale (en-US)
    const toLocaleSpy = vi
      .spyOn(Number.prototype, "toLocaleString")
      .mockImplementation(function (this: number) {
        return originalToLocaleString.call(this, "id-ID");
      });

    let root: ReturnType<typeof hydrateRoot> | null = null;
    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      const serverHtml = renderToString(
        <PastCraftExperience
          community={largePayload}
          youtubeFeed={emptyYouTubeFeed}
        />
      );
      expect(serverHtml).toContain("2,900");
      expect(serverHtml).toContain("1,524");
      expect(serverHtml).not.toContain("2.900");
      expect(serverHtml).not.toContain("1.524");

      toLocaleSpy.mockImplementation(function (this: number) {
        return originalToLocaleString.call(this, "en-US");
      });

      container.innerHTML = serverHtml;
      const recoverableErrors: unknown[] = [];

      await act(async () => {
        root = hydrateRoot(
          container,
          <PastCraftExperience
            community={largePayload}
            youtubeFeed={emptyYouTubeFeed}
          />,
          {
            onRecoverableError: (error) => {
              recoverableErrors.push(error);
            },
          }
        );
      });

      expect(recoverableErrors).toEqual([]);
      expect(container.textContent).toContain("2,900");
      expect(container.textContent).toContain("1,524");
    } finally {
      if (root) {
        await act(async () => {
          root?.unmount();
        });
      }
      container.remove();
      toLocaleSpy.mockRestore();
    }
  });

  it("renders custom Discord card with live aggregated status, handles unavailable fallback without fake numbers, and never embeds Discord iframes or playlist URLs", () => {
    const payload = buildMockPayload("seed");
    const onlineWidget: DiscordWidgetSummary = {
      name: "PastCraft",
      available: true,
      status: "online",
      serverName: "PastCraft",
      presenceCount: 1205,
      inviteUrl: "https://discord.gg/NNXXb9DKJv",
      cachedAt: "2026-11-27T07:00:00.000Z",
    };

    const { container, unmount } = render(
      <PastCraftExperience
        community={payload}
        youtubeFeed={populatedYouTubeFeed}
        discordWidget={onlineWidget}
      />
    );

    expect(screen.getByTestId("discord-server-card")).toBeInTheDocument();
    expect(screen.getByTestId("discord-online-count")).toHaveTextContent(
      "1,205 online now"
    );
    expect(container.querySelector('iframe[src*="discord.com"]')).toBeNull();
    expect(container.innerHTML).not.toContain("youtube.com/playlist");
    expect(container.innerHTML).not.toContain("jct=");
    unmount();

    const unavailableWidget: DiscordWidgetSummary = {
      name: "PastCraft",
      available: false,
      status: "unavailable",
      serverName: "PastCraft",
      presenceCount: null,
      inviteUrl: "https://discord.gg/NNXXb9DKJv",
      cachedAt: "2026-11-27T07:00:00.000Z",
    };

    render(
      <PastCraftExperience
        community={payload}
        youtubeFeed={emptyYouTubeFeed}
        discordWidget={unavailableWidget}
      />
    );

    expect(screen.getByTestId("discord-server-card")).toBeInTheDocument();
    expect(screen.queryByTestId("discord-online-count")).toBeNull();
    expect(screen.getByTestId("discord-widget-fallback")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Join Our Discord/i })
    ).toHaveAttribute("href", "https://discord.gg/NNXXb9DKJv");
  });
});
