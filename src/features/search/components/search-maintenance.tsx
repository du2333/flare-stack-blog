import { useMutation } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { buildSearchIndexFn } from "@/features/search/api/search.api";
import { m } from "@/paraglide/messages";

export function SearchMaintenance() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const rebuildToastId = "search-index-rebuild";
  const rebuildSearchIndexMutation = useMutation({
    mutationFn: buildSearchIndexFn,
    onMutate: () => {
      toast.loading(m.settings_maintenance_search_toast_loading(), {
        id: rebuildToastId,
      });
    },
    onSuccess: (result) => {
      toast.success(
        m.settings_maintenance_search_toast_success({
          duration: result.duration,
          indexed: result.indexed,
        }),
        { id: rebuildToastId },
      );
    },
    onSettled: (_data, error) => {
      if (!error) return;
      toast.dismiss(rebuildToastId);
    },
  });

  const handleRebuild = () => {
    setIsModalOpen(false);
    rebuildSearchIndexMutation.mutate({});
  };

  return (
    <div className="flex flex-col overflow-hidden border border-border/30 bg-background/50">
      <div className="flex-1 p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="rounded-sm bg-muted/30 p-3">
            <Database size={20} className="text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-serif font-medium text-foreground tracking-tight">
              {m.settings_maintenance_search_title()}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {m.settings_maintenance_search_desc_short()}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {m.settings_maintenance_search_desc_long()}
        </p>
      </div>

      <div className="px-8 pb-8 mt-auto">
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={rebuildSearchIndexMutation.isPending}
          className="h-10 w-full gap-3 rounded-none bg-foreground px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-90"
        >
          {rebuildSearchIndexMutation.isPending ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {m.settings_maintenance_search_btn()}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleRebuild}
        title={m.settings_maintenance_search_confirm_title()}
        message={m.settings_maintenance_search_confirm_message()}
        confirmLabel={m.settings_maintenance_search_confirm_btn()}
      />
    </div>
  );
}
