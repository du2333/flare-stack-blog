import { ClientOnly, useRouteContext } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/admin-page";
import { FrameActionSkeleton } from "@/components/admin/frame-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import "@/components/ui/page-heading.css";
import "./dashboard.css";
import "./ranked-bar-list.css";
import { formatToday } from "./format";
import { greeting } from "./greeting";

function SectionTitle({ width }: { width: string }) {
  return <Skeleton className={`h-[22px] ${width}`} />;
}

/** One list row's height: a Post, a ranked Post. */
function RowSkeleton() {
  return (
    <div className="admin-list-row">
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="ml-auto h-4 w-14" />
    </div>
  );
}

/**
 * The overview's layout in placeholders: tiles, then the two columns. The
 * greeting and date need the browser's clock (the server's would differ), so
 * they are placeholders until it takes over; the rest is the page's own boxes,
 * so nothing moves when the data arrives.
 */
export function DashboardSkeleton() {
  const { session } = useRouteContext({ from: "/admin" });
  const now = new Date();
  return (
    <AdminPage
      className="dashboard-workspace"
      aria-hidden="true"
      title={
        <ClientOnly fallback={<Skeleton className="h-6 w-56" />}>
          {greeting(session.user.name, now.getHours())}
        </ClientOnly>
      }
      description={
        <ClientOnly fallback={"\u00a0"}>{formatToday(now)}</ClientOnly>
      }
      actions={<FrameActionSkeleton />}
      body="list"
    >
      <ul className="glance-tiles">
        {[0, 1, 2].map((tile) => (
          <li key={tile}>
            <div className="glance-tile">
              <Skeleton className="glance-tile-number h-8 w-9" />
              <Skeleton className="h-[22px] w-24" />
              <Skeleton className="h-[18px] w-3/4" />
            </div>
          </li>
        ))}
      </ul>
      <div className="glance-grid">
        <div className="glance-col glance-col-main">
          <div className="dashboard-section glance-slot-status dashboard-status">
            <SectionTitle width="w-24" />
            <ul className="dashboard-stats">
              {[0, 1, 2, 3].map((figure) => (
                <li key={figure}>
                  <div className="dashboard-stat gap-2">
                    <Skeleton className="h-[18px] w-14" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-[18px] w-24" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="dashboard-section glance-slot-popular">
            <SectionTitle width="w-32" />
            <ol className="ranked-bar-list">
              {[100, 80, 62, 45, 30].map((share) => (
                <li key={share} className="ranked-bar-row">
                  <Skeleton className="ranked-bar-rank h-6 w-8" />
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-4 w-16" />
                  <span />
                  <span className="ranked-bar-track">
                    <Skeleton
                      className="h-full rounded-none"
                      style={{ width: `${share}%` }}
                    />
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="dashboard-section glance-slot-activity">
            <SectionTitle width="w-24" />
            <Skeleton className="h-[18px] w-48" />
            <Skeleton className="mt-2 aspect-[4/1] w-full rounded-md" />
          </div>
        </div>
        <div className="glance-col glance-col-side">
          <div className="dashboard-section glance-slot-comments">
            <SectionTitle width="w-28" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-3 py-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-[22px] w-1/3" />
                  <Skeleton className="h-[22px] w-full" />
                  <Skeleton className="h-[18px] w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <div className="dashboard-section glance-slot-recent">
            <SectionTitle width="w-24" />
            <div className="dashboard-recent-list">
              {[0, 1, 2, 3, 4].map((row) => (
                <RowSkeleton key={row} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
