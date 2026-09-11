import "./friend-link-manager.css";
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
      className="friend-workspace fuwari-card-base animate-pulse"
      aria-hidden="true"
    >
      <div className="friend-header">
        <div className="h-8 w-36 rounded-lg bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="friend-tabs py-4">
        <div className="h-6 w-64 rounded-lg bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="friend-body">
        <div className="friend-queue">
          <FriendLinkManagerSkeleton />
        </div>
        <div className="friend-detail p-8 gap-8">
          <div className="h-20 w-20 rounded-full bg-(--fuwari-btn-regular-bg)" />
          <div className="h-5 w-1/2 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          <div className="h-32 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        </div>
      </div>
    </div>
  );
}
