import { CacheMaintenance } from "@/features/cache/components/cache-maintenance";
import { PostPopularityMaintenance } from "@/features/post-popularity/components/post-popularity-maintenance";
import { SearchMaintenance } from "@/features/search/components/search-maintenance";
import { VersionMaintenance } from "@/features/version/components/version-maintenance";

export function MaintenanceSection() {
  return (
    <div>
      <VersionMaintenance />
      <PostPopularityMaintenance />
      <SearchMaintenance />
      <CacheMaintenance />
    </div>
  );
}
