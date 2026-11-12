import { AdminFormSection } from "@/components/admin/admin-page";
import { SettingsLead } from "@/features/config/components/admin/settings-lead";
import { m } from "@/paraglide/messages";
import { CacheMaintenance } from "@/features/cache/components/cache-maintenance";
import { PostPopularityMaintenance } from "@/features/post-popularity/components/post-popularity-maintenance";
import { SearchMaintenance } from "@/features/search/components/search-maintenance";
import { VersionMaintenance } from "@/features/version/components/version-maintenance";

/** A list of action rows; what cannot be undone is a group of its own. */
export function MaintenanceSection() {
  return (
    <div className="settings-maintenance-list">
      <SettingsLead description={m.settings_design_maintenance_hint()} />
      <AdminFormSection title={m.settings_maintenance_group_routine()}>
        <VersionMaintenance />
        <PostPopularityMaintenance />
        <SearchMaintenance />
      </AdminFormSection>
      <AdminFormSection title={m.settings_maintenance_group_danger()}>
        <CacheMaintenance />
      </AdminFormSection>
      <p className="settings-muted">{m.settings_design_immediate()}</p>
    </div>
  );
}
