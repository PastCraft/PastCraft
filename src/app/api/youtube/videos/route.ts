import { NextResponse } from "next/server";
import { getCommunityYouTubeVideos } from "@/lib/services/youtube";

export async function GET() {
  const result = await getCommunityYouTubeVideos();
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
}
