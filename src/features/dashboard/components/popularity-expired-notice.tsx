import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleAlert, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { usePostPopularitySync } from "@/features/post-popularity/hooks/use-post-popularity-sync";
import { m } from "@/paraglide/messages";
import {
  popularitySyncFailure,
  popularitySyncFailureMessage,
  type PopularitySyncFailure,
} from "./popularity-sync-failure";
import "@/components/ui/callout.css";

/**
 * The popularity alert of the popular list, synced from the notice itself:
 * the expired snapshot, or the failure the last sync recorded (it wins when
 * both hold). A sync that fails here swaps in its own reason; either way the
 * notice has a way to the maintenance page, where the details are.
 */
export function PopularityExpiredNotice({
  alert,
}: {
  alert: "failed" | "expired";
}) {
  const [syncFailure, setFailure] = useState<PopularitySyncFailure | null>(
    null,
  );
  const failure = syncFailure ?? (alert === "failed" ? "SYNC_FAILED" : null);
  const sync = usePostPopularitySync({
    onSuccess: () => setFailure(null),
    onError: (error) => setFailure(popularitySyncFailure(error)),
  });

  return (
    <Callout
      tone={failure ? "danger" : "warning"}
      icon={failure ? CircleAlert : TriangleAlert}
      role={failure ? "alert" : undefined}
      action={
        <>
          <Button
            size="sm"
            loading={sync.isPending}
            onClick={() => sync.mutate()}
          >
            {sync.isPending
              ? m.admin_overview_popularity_syncing()
              : m.admin_overview_popularity_sync()}
          </Button>
          {failure ? (
            <Link
              from="/"
              to="/admin/settings/maintenance"
              className={buttonClass({ variant: "text", size: "sm" })}
            >
              {m.admin_overview_popularity_maintenance_link()}
              <ArrowRight size={16} />
            </Link>
          ) : null}
        </>
      }
    >
      <span className="dashboard-notice-body">
        <strong className="dashboard-notice-title">
          {failure
            ? m.admin_overview_popularity_failed()
            : m.admin_overview_popularity_expired()}
        </strong>
        <span className="dashboard-notice-description">
          {failure
            ? popularitySyncFailureMessage(failure)
            : m.admin_overview_popularity_expired_desc()}
        </span>
      </span>
    </Callout>
  );
}
