import { SettingsLead } from "@/features/config/components/admin/settings-lead";
import { m } from "@/paraglide/messages";
import { CacheMaintenance } from "@/features/cache/components/cache-maintenance";
import { PostPopularityMaintenance } from "@/features/post-popularity/components/post-popularity-maintenance";
import { SearchMaintenance } from "@/features/search/components/search-maintenance";
import { VersionMaintenance } from "@/features/version/components/version-maintenance";

export function MaintenanceSection() {
  return (
    <div className="settings-column">
      <SettingsLead description={m.settings_design_maintenance_hint()} />
      <VersionMaintenance />
      <PostPopularityMaintenance />
      <SearchMaintenance />
      <CacheMaintenance />
      <p className="settings-muted">{m.settings_design_immediate()}</p>
    </div>
  );
}
