import { Flame, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { invalidateSiteCacheFn } from "@/features/cache/cache.api";
import { m } from "@/paraglide/messages";

export function CacheMaintenance() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInvalidate = () => {
    setIsModalOpen(false);
    toast.promise(
      async () => {
        await invalidateSiteCacheFn();
      },
      {
        loading: m.settings_maintenance_cache_toast_loading(),
        success: m.settings_maintenance_cache_toast_success(),
        error: (error) =>
          error.message || m.settings_maintenance_cache_toast_error(),
      },
    );
  };
  return (
    <div className="flex flex-col overflow-hidden border border-border/30 bg-background/50">
      <div className="flex-1 p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="rounded-sm bg-red-500/10 p-3">
            <Flame size={20} className="text-red-500/70" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-serif font-medium text-foreground tracking-tight">
              {m.settings_maintenance_cache_title()}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {m.settings_maintenance_cache_desc_short()}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {m.settings_maintenance_cache_desc_long()}
        </p>
      </div>

      <div className="px-8 pb-8 mt-auto">
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-10 w-full gap-3 rounded-none bg-red-600 px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white transition-all hover:bg-red-700"
        >
          <Trash2 size={12} />
          {m.settings_maintenance_cache_btn()}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleInvalidate}
        title={m.settings_maintenance_cache_confirm_title()}
        message={m.settings_maintenance_cache_confirm_message()}
        confirmLabel={m.settings_maintenance_cache_confirm_btn()}
      />
    </div>
  );
}
