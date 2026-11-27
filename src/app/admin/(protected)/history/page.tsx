import { HistoryManager } from "@/components/admin/HistoryManager";
import { getAdminRepository } from "@/lib/repositories";

export default async function AdminHistoryPage() {
  const repo = await getAdminRepository();
  const history = await repo.listTimelineEvents({ includeUnpublished: true });

  return <HistoryManager initialEvents={history} />;
}
