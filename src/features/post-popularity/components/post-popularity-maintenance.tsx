import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MaintenanceItem } from "@/features/config/components/maintenance-item";
import { usePostPopularitySync } from "@/features/post-popularity/hooks/use-post-popularity-sync";
import { postPopularityStatusQuery } from "@/features/post-popularity/queries";
import { formatDate } from "@/lib/utils";
import { StatusText } from "@/components/ui/status-text";
import { m } from "@/paraglide/messages";

export function PostPopularityMaintenance() {
  const { data: status } = useQuery(postPopularityStatusQuery);
  const syncMutation = usePostPopularitySync({
    onSuccess: () => {
      toast.success(m.settings_maintenance_popularity_toast_success());
    },
    onError: () => {
      toast.error(m.settings_maintenance_popularity_toast_error());
    },
  });
  const statusLabel = !status
    ? "-"
    : !status.configured
      ? m.settings_maintenance_popularity_status_unconfigured()
      : !status.lastSuccessAt
        ? m.settings_maintenance_popularity_status_pending()
        : status.expired
          ? m.settings_maintenance_popularity_status_expired()
          : m.settings_maintenance_popularity_status_ready();

  return (
    <MaintenanceItem
      icon={Flame}
      title={m.settings_maintenance_popularity_title()}
      lines={[
        <>
          {statusLabel}
          {status?.postCount != null ? ` · ${status.postCount}` : ""}
          {status?.lastSuccessAt
            ? ` · ${formatDate(status.lastSuccessAt, { includeTime: true })}`
            : ""}
        </>,
        m.settings_maintenance_popularity_auto(),
      ]}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          loading={syncMutation.isPending}
        >
          {syncMutation.isPending
            ? m.settings_maintenance_popularity_syncing()
            : m.settings_maintenance_popularity_sync_btn()}
        </Button>
      }
    >
      {status?.lastError ? (
        <StatusText error role={undefined} className="mt-1 break-words">
          {status.lastError}
        </StatusText>
      ) : null}
    </MaintenanceItem>
  );
}
