import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MaintenanceItem } from "@/features/config/components/maintenance-item";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { orpcClient } from "@/lib/orpc";
import { StatusText } from "@/components/ui/status-text";
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
      <MaintenanceItem
        title={m.settings_maintenance_search_title()}
        lines={[m.settings_maintenance_search_desc_short()]}
        action={
          <Button
            onClick={() => setIsModalOpen(true)}
            loading={rebuildSearchIndexMutation.isPending}
          >
            {m.settings_maintenance_search_btn()}
          </Button>
        }
      >
        {rebuildSearchIndexMutation.isSuccess && (
          <StatusText className="mt-2">
            {m.settings_maintenance_search_toast_success({
              duration: rebuildSearchIndexMutation.data.duration,
              indexed: rebuildSearchIndexMutation.data.indexed,
            })}
          </StatusText>
        )}
        {rebuildSearchIndexMutation.isError && (
          <StatusText error className="mt-2">
            {rebuildSearchIndexMutation.error.message}
          </StatusText>
        )}
      </MaintenanceItem>
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
