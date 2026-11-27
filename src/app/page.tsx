import { PastCraftExperience } from "@/components/public/PastCraftExperience";
import { loadPublicCommunityData } from "@/lib/repositories";
import { getDiscordWidgetSummary } from "@/lib/services/discord-widget";
import { getCommunityYouTubeVideos } from "@/lib/services/youtube";

export const revalidate = 60;

export default async function HomePage() {
  const [community, youtubeFeed, discordWidget] = await Promise.all([
    loadPublicCommunityData(),
    getCommunityYouTubeVideos(),
    getDiscordWidgetSummary(),
  ]);

  return (
    <PastCraftExperience
      community={community}
      youtubeFeed={youtubeFeed}
      discordWidget={discordWidget}
    />
  );
}
