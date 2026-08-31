import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export function SearchMaintenance() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const rebuildToastId = "search-index-rebuild";
  const rebuildSearchIndexMutation = useMutation({
    mutationFn: () => orpcClient.search.rebuild(),
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

  return (
    <>
      <div className="flex items-center gap-3 py-4 border-b border-(--fuwari-input-border)">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium fuwari-text-90">
            {m.settings_maintenance_search_title()}
          </p>
          <p className="text-xs fuwari-text-50">
            {m.settings_maintenance_search_desc_short()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={rebuildSearchIndexMutation.isPending}
          className="fuwari-btn-regular rounded-xl h-9 px-3 text-sm font-medium shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {rebuildSearchIndexMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : null}
          {m.settings_maintenance_search_btn()}
        </button>
      </div>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          setIsModalOpen(false);
          rebuildSearchIndexMutation.mutate();
        }}
        title={m.settings_maintenance_search_confirm_title()}
        message={m.settings_maintenance_search_confirm_message()}
        confirmLabel={m.settings_maintenance_search_confirm_btn()}
      />
    </>
  );
}
