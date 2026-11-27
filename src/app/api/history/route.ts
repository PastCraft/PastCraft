import { NextResponse } from "next/server";
import { getPublicRepository } from "@/lib/repositories";

export async function GET() {
  try {
    const repo = await getPublicRepository();
    const history = await repo.listTimelineEvents({ includeUnpublished: false });
    return NextResponse.json(
      { history },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load community history", history: [] },
      { status: 500 }
    );
  }
}
