import type { AuthenticatedAdmin } from "@/lib/auth/admin";
import type { CommunityRepository } from "@/lib/repositories/types";
import {
  sanitizeWebhookText,
  sendDiscordAdminNotification,
  type WebhookSeverity,
} from "./discord-webhook";

export interface AdminAuditActionInput {
  repo: CommunityRepository;
  admin: AuthenticatedAdmin;
  eventType: string;
  title: string;
  description: string;
  severity?: WebhookSeverity;
}

/**
 * Records an administrative action in `website_audit_logs` and delivers an
 * optional outgoing notification to `#pastcraft-log`. Failures in either
 * logging channel are isolated so primary database mutations always succeed.
 */
export async function recordAdminAction({
  repo,
  admin,
  eventType,
  title,
  description,
  severity = "info",
}: AdminAuditActionInput): Promise<void> {
  const safeDescription = sanitizeWebhookText(description, 1000);

  await Promise.allSettled([
    repo
      .createAuditLog({
        event_type: eventType,
        description: safeDescription,
        actor_id: admin.userId || null,
      })
      .catch(() => {
        console.error(
          `[PastCraft] Failed to persist website_audit_logs entry for ${eventType}.`
        );
      }),
    sendDiscordAdminNotification({
      eventType,
      title,
      description: safeDescription,
      actorRole: admin.role,
      severity,
    }),
  ]);
}
