import { CacheMaintenance } from "@/features/cache/components/cache-maintenance";
import { SearchMaintenance } from "@/features/search/components/search-maintenance";
import { VersionMaintenance } from "@/features/version/components/version-maintenance";
import { BackupRestoreSection } from "@/features/import-export/components/backup-restore-section";

export function MaintenanceSection() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Top Status Card: Version and System Health */}
      <section className="bg-muted/10 border border-border/30 p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-1 opacity-20 pointer-events-none">
          <span className="text-[40px] font-serif font-black italic tracking-tighter select-none">
            HEALTH
          </span>
        </div>
        <VersionMaintenance />
      </section>

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SearchMaintenance />
        <CacheMaintenance />
      </div>

      {/* Secondary / Larger Operations */}
      <div className="pt-4 border-t border-border/20">
        <BackupRestoreSection />
      </div>
    </div>
  );
}
