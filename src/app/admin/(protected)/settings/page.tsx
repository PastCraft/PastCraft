import { SettingsManager } from "@/components/admin/SettingsManager";
import { getAdminRepository } from "@/lib/repositories";

export default async function AdminSettingsPage() {
  const repo = await getAdminRepository();
  const settings = await repo.getSettings();

  return <SettingsManager initialSettings={settings} />;
}
