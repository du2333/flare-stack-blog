import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center gap-3 py-4 border-b border-(--fuwari-input-border)">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium fuwari-text-90">
          {m.settings_maintenance_popularity_title()}
        </p>
        <p className="text-xs fuwari-text-50">
          {statusLabel}
          {status?.postCount != null ? ` · ${status.postCount}` : ""}
          {status?.lastSuccessAt
            ? ` · ${formatDate(status.lastSuccessAt, { includeTime: true })}`
            : ""}
        </p>
        <p className="text-xs fuwari-text-50">
          {m.settings_maintenance_popularity_auto()}
        </p>
        {status?.lastError ? (
          <StatusText error role={undefined} className="mt-1 break-words">
            {status.lastError}
          </StatusText>
        ) : null}
      </div>
      <Button
        onClick={() => syncMutation.mutate()}
        loading={syncMutation.isPending}
      >
        {syncMutation.isPending
          ? m.settings_maintenance_popularity_syncing()
          : m.settings_maintenance_popularity_sync_btn()}
      </Button>
    </div>
  );
}
