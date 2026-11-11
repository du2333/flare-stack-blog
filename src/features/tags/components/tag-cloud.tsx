import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExpandableSidebarCard } from "@/components/layout/expandable-sidebar-card";
import { Skeleton } from "@/components/ui/skeleton";
import { withTagFilter } from "@/features/posts/utils/post-public-search";
import { tagsQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";

const COLLAPSE_THRESHOLD = 20;

export function TagsSkeleton() {
  return (
    <div className="fuwari-card-base fuwari-card-widget py-4 px-(--theme-widget-pad-x,1rem)">
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
    <ExpandableSidebarCard
      title={m.tags_title()}
      collapsed={collapsed}
      onExpand={() => setExpanded(true)}
      contentClassName="flex flex-wrap gap-2"
    >
      {tags.map((tag) => (
        <Link
          key={tag.id}
          to="/posts"
          search={withTagFilter(tag.name)}
          className="fuwari-btn-regular h-8 text-sm px-3 rounded-(--theme-chip-radius)"
        >
          {tag.name}
        </Link>
      ))}
    </ExpandableSidebarCard>
  );
}
