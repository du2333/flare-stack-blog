export function MediaLibraryPageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="hidden lg:flex justify-between items-center px-1">
        <div className="h-8 w-24 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        <div className="h-10 w-20 rounded-xl bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="fuwari-card-base p-5 md:p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-16 rounded-xl bg-(--fuwari-btn-regular-bg)" />
          <div className="h-9 w-24 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square rounded-xl bg-(--fuwari-btn-regular-bg)" />
              <div className="h-4 w-3/4 rounded-lg bg-(--fuwari-btn-regular-bg)" />
              <div className="h-3 w-1/2 rounded-lg bg-(--fuwari-btn-regular-bg)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
