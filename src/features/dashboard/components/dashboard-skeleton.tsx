import { AdminPage } from "@/components/admin/admin-page";
import { FrameActionSkeleton } from "@/components/admin/frame-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import "@/components/ui/page-heading.css";
import "./dashboard.css";
import "./ranked-bar-list.css";

/** The hero is tinted, so its placeholders take the card's colour. */
const ON_HERO = "bg-(--fuwari-card-bg) opacity-70";

function SectionTitle({ width }: { width: string }) {
  return <Skeleton className={`h-5 ${width}`} />;
}

/** The dashboard's layout in placeholders: hero, figures, then sections. */
export function DashboardSkeleton() {
  return (
    <AdminPage
      className="dashboard-workspace"
      aria-hidden="true"
      title={m.admin_overview_title()}
      actions={<FrameActionSkeleton />}
      body="list"
    >
      <div className="dashboard-hero">
        <div className="dashboard-hero-content w-full gap-3">
          <Skeleton className={`h-3.5 w-28 ${ON_HERO}`} />
          <Skeleton className={`h-9 w-72 max-w-full ${ON_HERO}`} />
          <Skeleton className={`h-4 w-96 max-w-full ${ON_HERO}`} />
          <Skeleton className={`mt-3 h-10 w-52 ${ON_HERO}`} />
        </div>
      </div>
      <ul className="dashboard-stats">
        {[0, 1, 2, 3].map((figure) => (
          <li key={figure}>
            <div className="dashboard-stat gap-2.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </li>
        ))}
      </ul>
      <div className="dashboard-grid">
        <div className="dashboard-column dashboard-column-main">
          <div className="dashboard-section dashboard-slot-popular">
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
          <div className="dashboard-section dashboard-slot-activity">
            <SectionTitle width="w-24" />
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="mt-2 aspect-[4/1] w-full rounded-md" />
          </div>
        </div>
        <div className="dashboard-column dashboard-column-side">
          <div className="dashboard-section dashboard-slot-comments">
            <SectionTitle width="w-28" />
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex gap-3 py-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
