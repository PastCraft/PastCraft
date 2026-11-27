import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { getAdminRepository } from "@/lib/repositories";
import { recordAdminAction } from "@/lib/services/admin-audit";
import {
  timelineEventCreateSchema,
  timelineEventUpdateSchema,
} from "@/lib/validation/schemas";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const repo = await getAdminRepository();
  const history = await repo.listTimelineEvents({ includeUnpublished: true });
  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = timelineEventCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = await getAdminRepository();
    const created = await repo.createTimelineEvent(parsed.data);

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: created.is_published ? "history.published" : "history.created",
      title: created.is_published
        ? "History Event Published"
        : "History Draft Created",
      description: `${created.is_published ? "Published" : "Created draft"} milestone "${
        created.title
      }" (${created.event_date}).`,
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op in unit tests
    }

    return NextResponse.json({ event: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create timeline event",
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
    const parsed = timelineEventUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const repo = await getAdminRepository();
    const updated = await repo.updateTimelineEvent(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: "Timeline event not found" },
        { status: 404 }
      );
    }

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "history.updated",
      title: "History Event Updated",
      description: `Updated milestone "${updated.title}" (${updated.event_date}, ${
        updated.is_published ? "published" : "draft"
      }).`,
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op in unit tests
    }

    return NextResponse.json({ event: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update timeline event",
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
        { error: "Timeline event ID is required" },
        { status: 400 }
      );
    }

    const repo = await getAdminRepository();
    const deleted = await repo.deleteTimelineEvent(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Timeline event not found" },
        { status: 404 }
      );
    }

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "history.deleted",
      title: "History Event Removed",
      description: `Deleted timeline event record (${id}).`,
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
          err instanceof Error ? err.message : "Failed to delete timeline event",
      },
      { status: 500 }
    );
  }
}
