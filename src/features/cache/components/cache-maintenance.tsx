import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MaintenanceItem } from "@/features/config/components/maintenance-item";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { orpcClient } from "@/lib/orpc";
import { StatusText } from "@/components/ui/status-text";
import { m } from "@/paraglide/messages";

export function CacheMaintenance() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => orpcClient.cache.invalidate(),
    onSuccess: () =>
      toast.success(m.settings_maintenance_cache_toast_success()),
    onError: () => toast.error(m.settings_maintenance_cache_toast_error()),
  });
  const handleInvalidate = () => {
    setIsModalOpen(false);
    mutation.mutate();
  };

  return (
    <>
      <MaintenanceItem
        title={m.settings_maintenance_cache_title()}
        lines={[m.settings_maintenance_cache_desc_short()]}
        action={
          <Button
            variant="danger"
            onClick={() => setIsModalOpen(true)}
            loading={mutation.isPending}
          >
            {mutation.isPending
              ? m.common_processing()
              : m.settings_maintenance_cache_btn()}
          </Button>
        }
      >
        {mutation.isSuccess && (
          <StatusText className="mt-2">
            {m.settings_maintenance_cache_toast_success()}
          </StatusText>
        )}
        {mutation.isError && (
          <StatusText error className="mt-2">
            {m.settings_maintenance_cache_toast_error()}
          </StatusText>
        )}
      </MaintenanceItem>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleInvalidate}
        title={m.settings_maintenance_cache_confirm_title()}
        message={m.settings_maintenance_cache_confirm_message()}
        confirmLabel={m.settings_maintenance_cache_confirm_btn()}
        isDanger
      />
    </>
  );
}
