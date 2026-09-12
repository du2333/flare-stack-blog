import { m } from "@/paraglide/messages";
import { CacheMaintenance } from "@/features/cache/components/cache-maintenance";
import { PostPopularityMaintenance } from "@/features/post-popularity/components/post-popularity-maintenance";
import { SearchMaintenance } from "@/features/search/components/search-maintenance";
import { VersionMaintenance } from "@/features/version/components/version-maintenance";

export function MaintenanceSection() {
  return (
    <div className="settings-maintenance">
      <div className="settings-section-heading">
        <div>
          <h2>{m.settings_nav_maintenance()}</h2>
          <p className="settings-muted">
            {m.settings_design_maintenance_hint()}
          </p>
        </div>
      </div>
      <VersionMaintenance />
      <PostPopularityMaintenance />
      <SearchMaintenance />
      <CacheMaintenance />
      <p className="settings-muted">{m.settings_design_immediate()}</p>
    </div>
  );
}
