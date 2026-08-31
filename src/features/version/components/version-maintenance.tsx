import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateCheckQuery } from "@/features/version/queries";
import { recordUpdateNoticeShown } from "@/features/version/update-notice";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export function VersionMaintenance() {
  const queryClient = useQueryClient();

  const checkUpdateMutation = useMutation({
    mutationFn: () => orpcClient.version.forceCheck(),
    onSuccess: (result) => {
      queryClient.setQueryData(updateCheckQuery.queryKey, result);
      if (result.hasUpdate) {
        recordUpdateNoticeShown(localStorage, result.latestVersion);
        toast.info(m.settings_maintenance_version_toast_new(), {
          description: m.settings_maintenance_version_toast_new_desc({
            version: result.latestVersion,
          }),
          action: {
            label: m.settings_maintenance_version_action_view(),
            onClick: () => window.open(result.releaseUrl, "_blank"),
          },
        });
        return;
      }
      toast.success(m.settings_maintenance_version_toast_latest(), {
        description: m.settings_maintenance_version_toast_latest_desc({
          version: result.currentVersion,
        }),
      });
    },
    onError: () => {
      toast.error(m.settings_maintenance_version_toast_fail(), {
        description: m.settings_maintenance_version_toast_fail_desc(),
      });
    },
  });

  return (
    <div className="flex items-center gap-3 py-4 border-b border-(--fuwari-input-border)">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium fuwari-text-90">
          {m.settings_maintenance_version_title()}
        </p>
        <p className="text-xs fuwari-text-50">
          {m.settings_maintenance_version_desc({ version: __APP_VERSION__ })}
        </p>
      </div>
      <button
        type="button"
        onClick={() => checkUpdateMutation.mutate()}
        disabled={checkUpdateMutation.isPending}
        className="fuwari-btn-regular rounded-xl h-9 px-3 text-sm font-medium shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        {checkUpdateMutation.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : null}
        {checkUpdateMutation.isPending
          ? m.settings_maintenance_version_checking()
          : m.settings_maintenance_version_check_btn()}
      </button>
    </div>
  );
}
