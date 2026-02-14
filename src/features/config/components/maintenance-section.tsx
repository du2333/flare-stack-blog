import { CacheMaintenance } from "@/features/cache/components/cache-maintenance";
import { SearchMaintenance } from "@/features/search/components/search-maintenance";
import { VersionMaintenance } from "@/features/version/components/version-maintenance";

export function MaintenanceSection() {
  return (
    <div className="space-y-16">
      <div className="space-y-px">
        {/* Property Row: Search Index */}
        <SearchMaintenance />

        {/* Property Row: Cache Management */}
        <CacheMaintenance />

        {/* Property Row: Version Update */}
        <VersionMaintenance />
      </div>
    </div>
  );
}
