import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { getAdminRepository } from "@/lib/repositories";
import { recordAdminAction } from "@/lib/services/admin-audit";
import { inferContinentFromCountryCode } from "@/lib/utils/geography";
import {
  locationCreateSchema,
  locationUpdateSchema,
} from "@/lib/validation/schemas";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const repo = await getAdminRepository();
  const locations = await repo.listLocations({ includeUnpublished: true });
  return NextResponse.json({ locations });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = locationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = await getAdminRepository();
    const created = await repo.createLocation({
      ...parsed.data,
      continent: inferContinentFromCountryCode(
        parsed.data.country_code,
        parsed.data.continent
      ),
    });

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "location.created",
      title: "Community Location Added",
      description: `Added ${created.city}, ${created.country} (${created.member_count} members, ${
        created.is_published ? "published" : "hidden"
      }).`,
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op outside Next request context (e.g. unit tests)
    }

    return NextResponse.json({ location: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create location",
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
    const parsed = locationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const repo = await getAdminRepository();
    const updated = await repo.updateLocation(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "location.updated",
      title: "Community Location Updated",
      description: `Updated ${updated.city}, ${updated.country} (${updated.member_count} members, ${
        updated.is_published ? "published" : "hidden"
      }).`,
    });

    try {
      revalidatePath("/");
    } catch {
      // Safe no-op in unit tests
    }

    return NextResponse.json({ location: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update location",
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
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    const repo = await getAdminRepository();
    const deleted = await repo.deleteLocation(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    await recordAdminAction({
      repo,
      admin: auth.admin,
      eventType: "location.deleted",
      title: "Community Location Removed",
      description: `Deleted community location record (${id}).`,
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
          err instanceof Error ? err.message : "Failed to delete location",
      },
      { status: 500 }
    );
  }
}
