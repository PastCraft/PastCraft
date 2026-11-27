import { YouTubeManager } from "@/components/admin/YouTubeManager";
import { getYouTubeServerConfig } from "@/lib/env";
import { getAdminRepository } from "@/lib/repositories";
import { getCommunityYouTubeVideos } from "@/lib/services/youtube";

export default async function AdminYouTubePage() {
  const repo = await getAdminRepository();
  const [settings, featuredVideos, retrievedFeed] = await Promise.all([
    repo.getSettings(),
    repo.listFeaturedVideos({ includeUnfeatured: true }),
    getCommunityYouTubeVideos({ includeHidden: true }),
  ]);

  const ytConfig = getYouTubeServerConfig(settings.youtube_channel_id);

  return (
    <YouTubeManager
      initialChannelId={settings.youtube_channel_id}
      initialFeaturedVideos={featuredVideos}
      initialRetrievedVideos={retrievedFeed.videos}
      feedStatus={retrievedFeed.status}
      feedMessage={retrievedFeed.message ?? null}
      hasServerApiKey={Boolean(ytConfig.apiKey)}
      hasServerPlaylistId={Boolean(ytConfig.playlistId)}
    />
  );
}
