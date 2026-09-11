import "./dashboard.css";

export function DashboardSkeleton() {
  return (
    <div
      className="dashboard-workspace fuwari-card-base animate-pulse"
      aria-hidden="true"
    >
      <div className="dashboard-header">
        <div className="space-y-3">
          <div className="h-8 w-24 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          <div className="h-4 w-56 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        </div>
      </div>
      <div className="dashboard-layout">
        <div className="dashboard-resume">
          <div className="space-y-4 w-2/3">
            <div className="h-4 w-24 rounded-lg bg-(--fuwari-btn-regular-bg)" />
            <div className="h-7 w-full rounded-lg bg-(--fuwari-btn-regular-bg)" />
            <div className="h-4 w-32 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          </div>
          <div className="h-11 w-28 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        </div>
        <div className="dashboard-recent">
          <div className="h-4 w-20 mb-5 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          <div className="dashboard-posts">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-(--fuwari-btn-regular-bg)"
              />
            ))}
          </div>
        </div>
        <div className="dashboard-activity dashboard-activity-split">
          {[0, 1].map((column) => (
            <div
              key={column}
              className={column ? "dashboard-comments" : "dashboard-tasks"}
            >
              <div className="h-6 w-28 mb-6 rounded-lg bg-(--fuwari-btn-regular-bg)" />
              {[0, 1, 2].map((row) => (
                <div key={row} className="py-5 space-y-3">
                  <div className="h-4 w-1/2 rounded-lg bg-(--fuwari-btn-regular-bg)" />
                  <div className="h-4 w-full rounded-lg bg-(--fuwari-btn-regular-bg)" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
