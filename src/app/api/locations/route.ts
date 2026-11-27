import { NextResponse } from "next/server";
import { getPublicRepository } from "@/lib/repositories";

export async function GET() {
  try {
    const repo = await getPublicRepository();
    const locations = await repo.listLocations({ includeUnpublished: false });
    return NextResponse.json(
      { locations },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load community locations", locations: [] },
      { status: 500 }
    );
  }
}
