import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { getAdminRepository } from "@/lib/repositories";
import { recordAdminAction } from "@/lib/services/admin-audit";
import { clearYouTubeCache } from "@/lib/services/youtube";
import {
  featuredVideoCreateSchema,
  featuredVideoUpdateSchema,
} from "@/lib/validation/schemas";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const repo = await getAdminRepository();
  const featuredVideos = await repo.listFeaturedVideos({
    includeUnfeatured: true,
  });
  return NextResponse.json({ featuredVideos });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = featuredVideoCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = await getAdminRepository();
    const saved = await repo.upsertFeaturedVideo(parsed.data);
    clearYouTubeCache();

    const stateLabel = saved.is_hidden
      ? "hidden from public site"
      : saved.is_featured
      ? `featured (order ${saved.sort_order})`
      : "visible";

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "media.video_updated",
      title: "Community Media Curation Updated",
      description: `Configured YouTube video ${saved.youtube_video_id} (${stateLabel}).`,
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op in unit tests
    }

    return NextResponse.json({ featuredVideo: saved }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to save featured video",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = featuredVideoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const repo = await getAdminRepository();
    const updated = await repo.updateFeaturedVideo(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: "Featured video not found" },
        { status: 404 }
      );
    }

    clearYouTubeCache();

    const stateLabel = updated.is_hidden
      ? "hidden from public site"
      : updated.is_featured
      ? `featured (order ${updated.sort_order})`
      : "visible";

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "media.video_updated",
      title: "Community Media Curation Updated",
      description: `Updated YouTube video ${updated.youtube_video_id} (${stateLabel}).`,
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op in unit tests
    }

    return NextResponse.json({ featuredVideo: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to update featured video",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    if (!id) {
      const body = await request.json().catch(() => null);
      id = body?.id ?? null;
    }

    if (!id) {
      return NextResponse.json(
        { error: "Featured video ID is required" },
        { status: 400 }
      );
    }

    const repo = await getAdminRepository();
    const deleted = await repo.deleteFeaturedVideo(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Featured video not found" },
        { status: 404 }
      );
    }

    clearYouTubeCache();

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "media.video_removed",
      title: "Community Media Curation Reset",
      description: `Removed curation record (${id}).`,
      severity: "warning",
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op in unit tests
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete featured video",
      },
      { status: 500 }
    );
  }
}
