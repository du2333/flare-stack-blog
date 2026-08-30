export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="hidden lg:flex justify-between items-center px-1">
        <div className="h-8 w-20 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        <div className="h-10 w-24 rounded-xl bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="flex gap-2 px-1">
        <div className="h-9 w-28 rounded-full bg-(--fuwari-btn-regular-bg)" />
        <div className="h-9 w-36 rounded-full bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="fuwari-card-base p-5 md:p-6 space-y-3">
        <div className="h-4 w-16 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex justify-between gap-4 rounded-xl px-3 py-3"
          >
            <div className="h-5 w-48 rounded-lg bg-(--fuwari-btn-regular-bg)" />
            <div className="h-4 w-24 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, column) => (
          <div key={column} className="fuwari-card-base p-5 md:p-6 space-y-3">
            <div className="h-4 w-20 rounded-lg bg-(--fuwari-btn-regular-bg)" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-3 py-3 space-y-2">
                <div className="h-4 w-40 rounded-lg bg-(--fuwari-btn-regular-bg)" />
                <div className="h-4 w-full rounded-lg bg-(--fuwari-btn-regular-bg)" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
