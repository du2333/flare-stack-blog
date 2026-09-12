import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { orpcClient } from "@/lib/orpc";
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
      <div className="flex items-center gap-3 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium fuwari-text-90">
            {m.settings_maintenance_cache_title()}
          </p>
          <p className="text-xs fuwari-text-50">
            {m.settings_maintenance_cache_desc_short()}
          </p>
          {mutation.isSuccess && (
            <p role="status" className="settings-operation-result">
              {m.settings_maintenance_cache_toast_success()}
            </p>
          )}
          {mutation.isError && (
            <p
              role="alert"
              className="settings-operation-result"
              data-error="true"
            >
              {m.settings_maintenance_cache_toast_error()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={mutation.isPending}
          className="fuwari-btn-regular rounded-xl h-9 px-3 text-sm font-medium shrink-0"
        >
          {mutation.isPending
            ? m.common_processing()
            : m.settings_maintenance_cache_btn()}
        </button>
      </div>
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
