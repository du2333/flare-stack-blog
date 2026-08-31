import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { withTagFilter } from "@/features/posts/utils/post-public-search";
import { tagsQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";

const COLLAPSED_HEIGHT = "7.5rem";
const COLLAPSE_THRESHOLD = 20;

export function TagsSkeleton() {
  return (
    <div className="fuwari-card-base p-4">
      <Skeleton className="h-5 w-20 mb-3" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function Tags() {
  const { data: tags } = useSuspenseQuery(tagsQueryOptions);
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) return null;

  const collapsed = tags.length >= COLLAPSE_THRESHOLD && !expanded;

  return (
    <div className="fuwari-card-base pb-4">
      <div className="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-2">
        <span
          className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
        {m.tags_title()}
      </div>
      <div
        className="px-4 flex flex-wrap gap-2 overflow-hidden"
        style={collapsed ? { height: COLLAPSED_HEIGHT } : undefined}
      >
        {tags.map((tag) => (
          <Link
            key={tag.id}
            to="/posts"
            search={withTagFilter(tag.name)}
            className="fuwari-btn-regular h-8 text-sm px-3 rounded-lg"
          >
            {tag.name}
          </Link>
        ))}
      </div>
      {collapsed && (
        <div className="px-4 -mb-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-lg w-full h-9 flex items-center justify-center text-black/75 hover:text-(--fuwari-primary) dark:text-white/75 dark:hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) transition"
          >
            <span className="text-(--fuwari-primary) flex items-center justify-center gap-2 -translate-x-2">
              <Ellipsis size={28} />
              {m.widget_more()}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
