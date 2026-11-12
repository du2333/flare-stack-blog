import { SettingsLead } from "@/features/config/components/admin/settings-lead";
import { m } from "@/paraglide/messages";
import { CacheMaintenance } from "@/features/cache/components/cache-maintenance";
import { PostPopularityMaintenance } from "@/features/post-popularity/components/post-popularity-maintenance";
import { SearchMaintenance } from "@/features/search/components/search-maintenance";
import { VersionMaintenance } from "@/features/version/components/version-maintenance";

/** The Maintenance actions as tiles, two to a row; what cannot be undone says so. */
export function MaintenanceSection() {
  return (
    <div className="settings-maintenance-list">
      <SettingsLead
        description={`${m.settings_design_maintenance_hint()}${m.settings_design_immediate()}`}
      />
      <div className="settings-maintenance-grid">
        <VersionMaintenance />
        <PostPopularityMaintenance />
        <SearchMaintenance />
        <CacheMaintenance />
      </div>
    </div>
  );
}
