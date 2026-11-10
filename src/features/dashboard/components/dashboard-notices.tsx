import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  Mail,
  PenLine,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { usePostPopularitySync } from "@/features/post-popularity/hooks/use-post-popularity-sync";
import { m } from "@/paraglide/messages";
import {
  popularitySyncFailure,
  popularitySyncFailureMessage,
  type PopularitySyncFailure,
} from "./popularity-sync-failure";
import "@/components/ui/callout.css";

/** The callout's inside: icon, a title and one line of what to do. */
function NoticeBody({
  icon: Icon,
  title,
  description,
  external = false,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  external?: boolean;
}) {
  const Arrow = external ? ArrowUpRight : ArrowRight;
  return (
    <>
      <Icon size={18} aria-hidden="true" className="fuwari-callout-icon" />
      <span className="fuwari-callout-body dashboard-notice-body">
        <strong className="dashboard-notice-title">{title}</strong>
        <span className="dashboard-notice-description">{description}</span>
      </span>
      <Arrow size={16} aria-hidden="true" className="dashboard-notice-arrow" />
    </>
  );
}

/**
 * The expired snapshot, synced from the notice itself. A failed sync swaps in
 * its reason and a way to the maintenance page, where the details are.
 */
export function PopularityExpiredNotice() {
  const [failure, setFailure] = useState<PopularitySyncFailure | null>(null);
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

/** Things to fix or know about, each a link to where it is handled. */
export function DashboardNotices({
  update,
  popularityAlert,
  adminEmailNeedsSetup,
  defaultSiteIdentity,
}: Pick<
  DashboardOverview,
  "update" | "popularityAlert" | "adminEmailNeedsSetup" | "defaultSiteIdentity"
>) {
  const notices: Array<{ key: string; node: ReactNode }> = [];
  const callout = (key: string, node: ReactNode) => notices.push({ key, node });

  if (popularityAlert === "failed")
    callout(
      "popularity-failed",
      <Link
        from="/"
        to="/admin/settings/maintenance"
        className="fuwari-callout"
        data-tone="danger"
      >
        <NoticeBody
          icon={CircleAlert}
          title={m.admin_overview_popularity_failed()}
          description={m.admin_overview_popularity_failed_desc()}
        />
      </Link>,
    );
  if (popularityAlert === "expired")
    callout("popularity-expired", <PopularityExpiredNotice />);
  if (adminEmailNeedsSetup)
    callout(
      "email",
      <Link
        from="/"
        to="/admin/settings/notifications"
        className="fuwari-callout"
        data-tone="warning"
      >
        <NoticeBody
          icon={Mail}
          title={m.admin_overview_email_needs_setup()}
          description={m.admin_overview_email_needs_setup_desc()}
        />
      </Link>,
    );
  if (defaultSiteIdentity)
    callout(
      "identity",
      <Link
        from="/"
        to="/admin/settings/site"
        className="fuwari-callout"
        data-tone="info"
      >
        <NoticeBody
          icon={PenLine}
          title={m.admin_overview_default_site_identity()}
          description={m.admin_overview_default_site_identity_desc()}
        />
      </Link>,
    );
  if (update)
    callout(
      "update",
      <a
        href={update.releaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fuwari-callout"
        data-tone="success"
      >
        <NoticeBody
          icon={Sparkles}
          external
          title={m.admin_overview_update_available({
            version: update.latestVersion,
          })}
          description={m.admin_overview_update_available_desc({
            current: __APP_VERSION__,
          })}
        />
      </a>,
    );

  if (notices.length === 0) return null;
  return (
    <ul className="dashboard-notices" data-count={notices.length}>
      {notices.map((notice) => (
        <li key={notice.key}>{notice.node}</li>
      ))}
    </ul>
  );
}
