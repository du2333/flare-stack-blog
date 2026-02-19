import { Suspense } from "react";
import { Profile } from "./profile";
import { Tags, TagsSkeleton } from "./tags";

export function Sidebar() {
  return (
    <aside className="flex flex-col gap-4">
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "100ms" }}
      >
        <Profile />
      </div>
      <div
        className="sticky top-24 fuwari-onload-animation"
        style={{ animationDelay: "150ms" }}
      >
        <Suspense fallback={<TagsSkeleton />}>
          <Tags />
        </Suspense>
      </div>
    </aside>
  );
}
