export function FriendLinkManagerSkeleton() {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="px-4 py-4 flex gap-3 border-b border-(--fuwari-input-border) last:border-0 animate-pulse"
        >
          <div className="w-10 h-10 rounded-xl bg-(--fuwari-btn-regular-bg)" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-1/3 rounded-lg bg-(--fuwari-btn-regular-bg)" />
            <div className="h-4 w-2/3 rounded-lg bg-(--fuwari-btn-regular-bg)" />
            <div className="h-3 w-1/2 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FriendLinkManagerPageSkeleton() {
  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 animate-pulse fuwari-onload-animation"
      style={{ animationDelay: "var(--fuwari-content-delay)" }}
    >
      <div className="hidden lg:flex justify-between items-center">
        <div className="h-8 w-28 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        <div className="h-10 w-16 rounded-xl bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-20 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        <div className="h-9 w-20 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        <div className="h-9 w-20 rounded-xl bg-(--fuwari-btn-regular-bg)" />
      </div>
      <FriendLinkManagerSkeleton />
    </div>
  );
}
