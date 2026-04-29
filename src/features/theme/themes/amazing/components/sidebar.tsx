import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { Profile } from "./profile";
import { Tags, TagsSkeleton } from "./tags";

/**
 * Enhanced Sidebar — Amazing Theme
 *
 * Features staggered slide-in-left animation for profile and tags panels.
 */
export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      <div
        className="fuwari-onload-animation"
        style={{
          animationDelay: "100ms",
          animationName: "amazing-slide-in-left",
          animationDuration: "600ms",
          animationTimingFunction: "var(--amazing-spring)",
        }}
      >
        <Profile />
      </div>
      <div
        className="sticky top-4 fuwari-onload-animation"
        style={{
          animationDelay: "250ms",
          animationName: "amazing-slide-in-left",
          animationDuration: "600ms",
          animationTimingFunction: "var(--amazing-spring)",
        }}
      >
        <Suspense fallback={<TagsSkeleton />}>
          <Tags />
        </Suspense>
      </div>
    </aside>
  );
}
