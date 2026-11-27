import { LocationsManager } from "@/components/admin/LocationsManager";
import { getAdminRepository } from "@/lib/repositories";

export default async function AdminLocationsPage() {
  const repo = await getAdminRepository();
  const locations = await repo.listLocations({ includeUnpublished: true });

  return <LocationsManager initialLocations={locations} />;
}
