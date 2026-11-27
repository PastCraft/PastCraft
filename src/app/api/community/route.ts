import { NextResponse } from "next/server";
import { loadPublicCommunityData } from "@/lib/repositories";

export async function GET() {
  const data = await loadPublicCommunityData();
  return NextResponse.json(
    {
      settings: data.settings,
      statistics: data.statistics,
      dataSource: data.dataSource,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
