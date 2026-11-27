import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { getAdminRepository } from "@/lib/repositories";
import { recordAdminAction } from "@/lib/services/admin-audit";
import { clearDiscordWidgetCache } from "@/lib/services/discord-widget";
import { clearYouTubeCache } from "@/lib/services/youtube";
import { communitySettingsUpdateSchema } from "@/lib/validation/schemas";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const repo = await getAdminRepository();
  const settings = await repo.getSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi({ scope: "write" });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = communitySettingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = await getAdminRepository();
    const settings = await repo.updateSettings(parsed.data);

    if (parsed.data.youtube_channel_id !== undefined) {
      clearYouTubeCache();
    }
    if (
      parsed.data.discord_url !== undefined ||
      parsed.data.community_name !== undefined
    ) {
      clearDiscordWidgetCache();
    }

    const updatedFields = Object.keys(parsed.data);
    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "settings.updated",
      title: "Community Settings Updated",
      description: `Updated community settings (${
        updatedFields.length > 0 ? updatedFields.join(", ") : "general"
      }).`,
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op in unit tests
    }

    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update settings",
      },
      { status: 500 }
    );
  }
}
