export function MutedUsersListSkeleton() {
  return (
    <div>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="px-4 py-4 flex gap-3 border-b border-(--fuwari-input-border) last:border-0 animate-pulse"
        >
          <div className="w-10 h-10 rounded-full bg-(--fuwari-btn-regular-bg)" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-1/4 rounded-lg bg-(--fuwari-btn-regular-bg)" />
            <div className="h-3 w-1/3 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MutedUsersPageSkeleton() {
  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 animate-pulse fuwari-onload-animation"
      style={{ animationDelay: "var(--fuwari-content-delay)" }}
    >
      <div className="hidden lg:block h-8 w-28 rounded-lg bg-(--fuwari-btn-regular-bg)" />
      <MutedUsersListSkeleton />
    </div>
  );
}
