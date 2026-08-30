import { memo } from "react";

export const PostRowSkeleton = memo(() => (
  <div className="px-4 py-4 flex flex-col gap-2 border-b border-(--fuwari-input-border) animate-pulse">
    <div className="h-4 w-16 rounded-full bg-(--fuwari-btn-regular-bg)" />
    <div className="h-5 w-3/4 rounded-lg bg-(--fuwari-btn-regular-bg)" />
    <div className="h-4 w-1/2 rounded-lg bg-(--fuwari-btn-regular-bg)" />
  </div>
));

PostRowSkeleton.displayName = "PostRowSkeleton";

export function PostManagerSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <PostRowSkeleton key={i} />
      ))}
    </div>
  );
}
