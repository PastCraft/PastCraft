import { NextResponse } from "next/server";
import { getDiscordWidgetSummary } from "@/lib/services/discord-widget";

export async function GET() {
  const summary = await getDiscordWidgetSummary();
  return NextResponse.json(summary, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
    },
  });
}
