import { Skeleton } from "@/components/ui/skeleton";

/** One setting: its name and line on the left, a field's height on the right. */
function RowSkeleton() {
  return (
    <div className="admin-form-row">
      <div className="admin-form-row-text">
        <Skeleton className="h-[22px] w-32" />
        <Skeleton className="mt-0.5 h-[18px] w-48 max-w-full" />
      </div>
      <div className="admin-form-row-control">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

/** The settings form in placeholders: a section title, then its rows. */
export function SettingsInnerSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1].map((section) => (
        <section key={section} className="admin-form-section">
          <div className="admin-form-section-head">
            <Skeleton className="h-[22px] w-24" />
          </div>
          <div className="admin-form-section-body">
            {[0, 1, 2].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
