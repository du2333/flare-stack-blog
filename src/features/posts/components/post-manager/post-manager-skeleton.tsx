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
    <div>
      {[1, 2, 3, 4, 5].map((i) => (
        <PostRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function PostManagerPageSkeleton() {
  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 animate-pulse fuwari-onload-animation"
      style={{ animationDelay: "var(--fuwari-content-delay)" }}
    >
      <div className="hidden lg:flex justify-between items-center">
        <div className="h-8 w-28 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        <div className="h-10 w-24 rounded-xl bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="h-11 w-full rounded-xl bg-(--fuwari-btn-regular-bg)" />
      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-16 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        <div className="h-9 w-20 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        <div className="h-9 w-16 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        <div className="h-9 w-24 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        <div className="h-9 w-24 rounded-xl bg-(--fuwari-btn-regular-bg)" />
      </div>
      <PostManagerSkeleton />
    </div>
  );
}
