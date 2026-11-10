import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MaintenanceItem } from "@/features/config/components/maintenance-item";
import { updateCheckQuery } from "@/features/version/queries";
import { recordUpdateNoticeShown } from "@/features/version/update-notice";
import { orpcClient } from "@/lib/orpc";
import { StatusText } from "@/components/ui/status-text";
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
    <MaintenanceItem
      title={m.settings_maintenance_version_title()}
      lines={[
        m.settings_maintenance_version_desc({ version: __APP_VERSION__ }),
      ]}
      action={
        <Button
          onClick={() => checkUpdateMutation.mutate()}
          loading={checkUpdateMutation.isPending}
        >
          {checkUpdateMutation.isPending
            ? m.settings_maintenance_version_checking()
            : m.settings_maintenance_version_check_btn()}
        </Button>
      }
    >
      {checkUpdateMutation.isSuccess && checkUpdateMutation.data && (
        <StatusText className="mt-2">
          {checkUpdateMutation.data.hasUpdate ? (
            <a
              href={checkUpdateMutation.data.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--fuwari-primary)"
            >
              {m.settings_maintenance_version_toast_new_desc({
                version: checkUpdateMutation.data.latestVersion,
              })}
            </a>
          ) : (
            m.settings_maintenance_version_toast_latest_desc({
              version: checkUpdateMutation.data.currentVersion,
            })
          )}
        </StatusText>
      )}
      {checkUpdateMutation.isError && (
        <StatusText error className="mt-2">
          {m.settings_maintenance_version_toast_fail()}
        </StatusText>
      )}
    </MaintenanceItem>
  );
}
