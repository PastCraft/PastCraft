import { getDiscordWebhookUrl } from "@/lib/env";

const WEBHOOK_DISPLAY_NAME = "Official Website";
const WEBHOOK_TIMEOUT_MS = 5000;
const ERROR_ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export type WebhookSeverity = "info" | "warning" | "error";

export interface DiscordAdminNotificationInput {
  eventType: string;
  title: string;
  description: string;
  actorRole?: string;
  severity?: WebhookSeverity;
}

const SEVERITY_COLORS: Record<WebhookSeverity, number> = {
  info: 0x38bdf8, // Sky blue
  warning: 0xf59e0b, // Amber
  error: 0xf43f5e, // Rose
};

const globalForWebhookThrottle = globalThis as unknown as {
  __pastcraftWebhookAlertTimestamps?: Map<string, number>;
};

function getAlertThrottleMap(): Map<string, number> {
  if (!globalForWebhookThrottle.__pastcraftWebhookAlertTimestamps) {
    globalForWebhookThrottle.__pastcraftWebhookAlertTimestamps = new Map();
  }
  return globalForWebhookThrottle.__pastcraftWebhookAlertTimestamps;
}

export function clearWebhookAlertThrottle(): void {
  getAlertThrottleMap().clear();
}

/**
 * Sanitizes outgoing notification text so webhook embeds cannot trigger Discord
 * mass pings, mention arbitrary roles/users, or include control characters.
 */
export function sanitizeWebhookText(input: string, maxLength: number): string {
  const cleaned = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/@(everyone|here)/gi, "@\u200b$1")
    .replace(/<@([!&]?\d+)>/g, "[mention]")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/**
 * Sends a server-validated administrative event notification to Discord (#pastcraft-log).
 * Never exposes DISCORD_WEBHOOK_URL, never includes private personal info, and never throws.
 */
export async function sendDiscordAdminNotification(
  input: DiscordAdminNotificationInput
): Promise<boolean> {
  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl) {
    return false;
  }

  const severity: WebhookSeverity = input.severity ?? "info";
  const title = sanitizeWebhookText(input.title, 200) || "Website Update";
  const description =
    sanitizeWebhookText(input.description, 1000) ||
    "An administrative update was recorded on the PastCraft website.";
  const eventType = sanitizeWebhookText(input.eventType, 80) || "admin.event";

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "Event", value: eventType, inline: true },
  ];

  if (input.actorRole) {
    fields.push({
      name: "Role",
      value: sanitizeWebhookText(input.actorRole, 40),
      inline: true,
    });
  }

  const payload = {
    username: WEBHOOK_DISPLAY_NAME,
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title,
        description,
        color: SEVERITY_COLORS[severity],
        fields,
        footer: {
          text: "PastCraft Official Website · #pastcraft-log",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[PastCraft] Discord admin webhook returned status ${response.status} for event ${eventType}.`
      );
      return false;
    }

    return true;
  } catch {
    console.error(
      `[PastCraft] Discord admin webhook request failed for event ${eventType}.`
    );
    return false;
  }
}

/**
 * Throttled helper for reporting important server-side integration failures
 * (such as upstream YouTube API outages) to #pastcraft-log without spamming.
 */
export async function notifyIntegrationError(
  eventType: string,
  title: string,
  description: string
): Promise<boolean> {
  const throttleMap = getAlertThrottleMap();
  const now = Date.now();
  const lastSent = throttleMap.get(eventType) ?? 0;

  if (now - lastSent < ERROR_ALERT_COOLDOWN_MS) {
    return false;
  }

  throttleMap.set(eventType, now);
  return sendDiscordAdminNotification({
    eventType,
    title,
    description,
    severity: "error",
  });
}
