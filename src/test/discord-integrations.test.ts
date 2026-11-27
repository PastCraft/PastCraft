// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getDiscordWidgetRoute } from "@/app/api/discord/widget/route";
import { POST as postAdminHistory } from "@/app/api/admin/history/route";
import { setAdminVerifierOverride } from "@/lib/auth/admin";
import { isValidDiscordWebhookUrl } from "@/lib/env";
import { setRepositoryOverride } from "@/lib/repositories";
import { FallbackCommunityRepository } from "@/lib/repositories/fallback-repository";
import {
  clearDiscordWidgetCache,
  getDiscordWidgetSummary,
} from "@/lib/services/discord-widget";
import {
  clearWebhookAlertThrottle,
  sanitizeWebhookText,
  sendDiscordAdminNotification,
} from "@/lib/services/discord-webhook";

describe("Discord Widget & Administrative Webhook Integrations", () => {
  const originalEnv = { ...process.env };
  let repo: FallbackCommunityRepository;

  beforeEach(() => {
    repo = new FallbackCommunityRepository(true);
    setRepositoryOverride(repo);
    setAdminVerifierOverride(null);
    clearDiscordWidgetCache();
    clearWebhookAlertThrottle();
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_INVITE_URL;
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setRepositoryOverride(null);
    setAdminVerifierOverride(null);
    clearDiscordWidgetCache();
    clearWebhookAlertThrottle();
    vi.restoreAllMocks();
  });

  it("retrieves safe aggregated Discord widget info, strips private member/channel data, and caches responses", async () => {
    process.env.DISCORD_GUILD_ID = "1423856051068997644";
    process.env.DISCORD_INVITE_URL = "https://discord.gg/NNXXb9DKJv";

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "1423856051068997644",
            name: "PastCraft",
            instant_invite: "https://discord.com/invite/raw-widget-invite",
            presence_count: 142,
            channels: [{ id: "vc-1", name: "Private Voice Lounge", position: 0 }],
            members: [
              {
                id: "user-1",
                username: "secret_player_name",
                status: "online",
                avatar_url: "https://cdn.discordapp.com/avatars/secret.png",
                game: { name: "Minecraft" },
                channel_id: "vc-1",
              },
            ],
          }),
          { status: 200 }
        )
      );

    const response = await getDiscordWidgetRoute();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.name).toBe("PastCraft");
    expect(body.available).toBe(true);
    expect(body.status).toBe("online");
    expect(body.serverName).toBe("PastCraft");
    expect(body.presenceCount).toBe(142);
    expect(body.inviteUrl).toBe("https://discord.gg/NNXXb9DKJv");

    // Privacy invariant: never leak individual members, channels, avatars, statuses, or activities
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("secret_player_name");
    expect(serialized).not.toContain("Private Voice Lounge");
    expect(serialized).not.toContain("Minecraft");
    expect(serialized).not.toContain("avatar_url");
    expect(body).not.toHaveProperty("members");
    expect(body).not.toHaveProperty("channels");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "https://discord.com/api/guilds/1423856051068997644/widget.json"
    );

    // Subsequent call is served from cache
    const cachedSummary = await getDiscordWidgetSummary();
    expect(cachedSummary.presenceCount).toBe(142);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("handles Discord widget unavailability gracefully without inventing fake online numbers", async () => {
    process.env.DISCORD_GUILD_ID = "1423856051068997644";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Widget Disabled" }), {
        status: 403,
      })
    );

    const summary = await getDiscordWidgetSummary();
    expect(summary.name).toBe("PastCraft");
    expect(summary.available).toBe(false);
    expect(summary.status).toBe("unavailable");
    expect(summary.presenceCount).toBeNull();
    expect(summary.serverName).toBe("PastCraft");
    expect(summary.inviteUrl).toBe("https://discord.gg/NNXXb9DKJv");
  });

  it("returns unconfigured status when DISCORD_GUILD_ID is explicitly disabled", async () => {
    process.env.DISCORD_GUILD_ID = "";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const summary = await getDiscordWidgetSummary();
    expect(summary.status).toBe("unconfigured");
    expect(summary.presenceCount).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates Discord webhook URLs strictly and sanitizes outgoing notifications", async () => {
    expect(
      isValidDiscordWebhookUrl(
        "https://discord.com/api/webhooks/123456789012345678/regenerated_token_value_12345"
      )
    ).toBe(true);
    expect(
      isValidDiscordWebhookUrl("http://discord.com/api/webhooks/123456789012345678/abc123456789012345")
    ).toBe(false);
    expect(
      isValidDiscordWebhookUrl("https://evil.example.com/api/webhooks/123456789012345678/abc123456789012345")
    ).toBe(false);

    const sanitized = sanitizeWebhookText(
      "Alert @everyone and @here plus <@123456789> \u0007update",
      200
    );
    expect(sanitized).not.toContain("@everyone");
    expect(sanitized).not.toContain("@here");
    expect(sanitized).not.toContain("<@123456789>");

    process.env.DISCORD_WEBHOOK_URL =
      "https://discord.com/api/webhooks/123456789012345678/regenerated_token_value_12345";

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    const delivered = await sendDiscordAdminNotification({
      eventType: "history.published",
      title: "History Event Published",
      description: "Published milestone with @everyone mention test",
      actorRole: "owner",
    });

    expect(delivered).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    const sentPayload = JSON.parse(String(init?.body));
    expect(sentPayload.username).toBe("Official Website");
    expect(sentPayload.allowed_mentions).toEqual({ parse: [] });
    expect(sentPayload.embeds[0].description).not.toContain("@everyone");
  });

  it("records audit logs and keeps admin mutations working even if the Discord webhook fails", async () => {
    process.env.DISCORD_WEBHOOK_URL =
      "https://discord.com/api/webhooks/123456789012345678/regenerated_token_value_12345";

    setAdminVerifierOverride(async () => ({
      authorized: true,
      admin: {
        userId: "00000000-0000-0000-0000-000000000099",
        email: "private-admin@pastcraft.org",
        role: "owner",
      },
    }));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("Upstream error", { status: 500 }));

    const res = await postAdminHistory(
      new Request("http://localhost:3000/api/admin/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Server Development Milestone",
          description: "Launched PastCraft v1.2 platform integrations.",
          event_date: "2026-11-27",
          category: "Server development",
          sort_order: 12,
          is_published: true,
        }),
      })
    );

    // Primary database operation must succeed despite webhook 500 failure
    expect(res.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Verify private admin email was never sent to Discord webhook
    const sentBody = String(fetchSpy.mock.calls[0][1]?.body ?? "");
    expect(sentBody).not.toContain("private-admin@pastcraft.org");
    expect(sentBody).toContain("Server Development Milestone");

    // Verify website_audit_logs persisted the event
    const logs = await repo.listAuditLogs({ limit: 5 });
    expect(logs.length).toBe(1);
    expect(logs[0].event_type).toBe("history.published");
    expect(logs[0].actor_id).toBe("00000000-0000-0000-0000-000000000099");

    // Verify error log never leaks webhook token
    const loggedMessages = consoleSpy.mock.calls.flat().join(" ");
    expect(loggedMessages).not.toContain("regenerated_token_value_12345");
  });
});
