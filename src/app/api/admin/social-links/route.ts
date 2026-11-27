import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { getAdminRepository } from "@/lib/repositories";
import { recordAdminAction } from "@/lib/services/admin-audit";
import {
  socialLinkCreateSchema,
  socialLinkUpdateSchema,
} from "@/lib/validation/schemas";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const repo = await getAdminRepository();
  const socialLinks = await repo.listSocialLinks({ includeUnpublished: true });
  return NextResponse.json({ socialLinks });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = socialLinkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = await getAdminRepository();
    const created = await repo.createSocialLink(parsed.data);

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "social_link.created",
      title: "Social Link Added",
      description: `Added ${created.platform} link "${created.label}" (${
        created.is_published ? "published" : "hidden"
      }).`,
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op in unit tests
    }

    return NextResponse.json({ socialLink: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create social link",
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
    const parsed = socialLinkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const repo = await getAdminRepository();
    const updated = await repo.updateSocialLink(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: "Social link not found" },
        { status: 404 }
      );
    }

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "social_link.updated",
      title: "Social Link Updated",
      description: `Updated ${updated.platform} link "${updated.label}" (${
        updated.is_published ? "published" : "hidden"
      }).`,
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op in unit tests
    }

    return NextResponse.json({ socialLink: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update social link",
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
        { error: "Social link ID is required" },
        { status: 400 }
      );
    }

    const repo = await getAdminRepository();
    const deleted = await repo.deleteSocialLink(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Social link not found" },
        { status: 404 }
      );
    }

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "social_link.deleted",
      title: "Social Link Removed",
      description: `Deleted social link record (${id}).`,
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
          err instanceof Error ? err.message : "Failed to delete social link",
      },
      { status: 500 }
    );
  }
}
