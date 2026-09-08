import "./post-manager.css";

export function PostRowSkeleton() {
  return (
    <tr aria-hidden="true">
      <td colSpan={4}>
        <div className="flex items-center gap-8 animate-pulse py-2">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-(--fuwari-btn-regular-bg)" />
            <div className="h-3 w-1/3 rounded bg-(--fuwari-btn-regular-bg)" />
          </div>
          <div className="h-5 w-14 rounded-full bg-(--fuwari-btn-regular-bg)" />
          <div className="hidden sm:block h-4 w-24 rounded bg-(--fuwari-btn-regular-bg)" />
        </div>
      </td>
    </tr>
  );
}

export function PostManagerSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((id) => (
        <PostRowSkeleton key={id} />
      ))}
    </>
  );
}

export function PostManagerPageSkeleton() {
  return (
    <div className="post-manager fuwari-card-base" aria-busy="true">
      <div className="post-list-heading animate-pulse">
        <div className="h-8 w-28 rounded bg-(--fuwari-btn-regular-bg)" />
        <div className="h-10 w-24 rounded bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="flex gap-6 h-12 items-center animate-pulse">
        {[1, 2, 3].map((id) => (
          <div
            key={id}
            className="h-4 w-16 rounded bg-(--fuwari-btn-regular-bg)"
          />
        ))}
      </div>
      <div className="post-list-controls">
        <div className="h-11 w-80 rounded-lg bg-(--fuwari-btn-regular-bg) animate-pulse" />
      </div>
      <table className="post-list-table">
        <tbody>
          <PostManagerSkeleton />
        </tbody>
      </table>
    </div>
  );
}
