import { SocialLinksManager } from "@/components/admin/SocialLinksManager";
import { getAdminRepository } from "@/lib/repositories";

export default async function AdminSocialLinksPage() {
  const repo = await getAdminRepository();
  const [settings, socialLinks] = await Promise.all([
    repo.getSettings(),
    repo.listSocialLinks({ includeUnpublished: true }),
  ]);

  return (
    <SocialLinksManager
      initialLinks={socialLinks}
      initialDiscordUrl={settings.discord_url}
    />
  );
}
