import { riseOrder } from "@/components/admin/canvas-page";
import "@/components/admin/canvas-page.css";
import { ListCard, ListCardRows } from "@/components/ui/list-card";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import { PostListColumns } from "./components/post-row";
import "./post-manager.css";

/** Rows of placeholders in the rows' grid and at their height. */
export function PostRowsSkeleton() {
  return Array.from({ length: 9 }, (_, index) => (
    <div key={index} className="post-skel" aria-hidden>
      <div>
        <Skeleton shimmer style={{ width: `${38 + ((index * 17) % 34)}%` }} />
        <Skeleton
          shimmer
          style={{ width: `${18 + ((index * 11) % 16)}%`, height: 10 }}
        />
      </div>
      <div>
        <Skeleton shimmer style={{ display: "block", width: 52 }} />
      </div>
      <div />
      <div />
      <div>
        <Skeleton shimmer style={{ display: "block", width: 48 }} />
      </div>
      <div />
    </div>
  ));
}

/**
 * The Posts list while its first page loads: the head, the bar and the card
 * of the real page at their sizes, the controls as placeholders.
 */
export function PostManagerPageSkeleton() {
  return (
    <div className="admin-canvas-page" aria-busy="true">
      <header className="admin-canvas-head admin-rise" style={riseOrder(0)}>
        <h1 className="admin-canvas-title">{m.admin_posts_title()}</h1>
        <Skeleton shimmer className="post-skel-primary" />
      </header>
      <div
        className="admin-canvas-bar admin-rise"
        style={riseOrder(1)}
        aria-hidden
      >
        <span className="post-skel-tabs">
          <Skeleton shimmer />
        </span>
        <div className="admin-canvas-tools">
          <Skeleton shimmer className="post-skel-search" />
          <Skeleton shimmer className="post-skel-chip" />
          <Skeleton shimmer className="post-skel-chip" />
          <Skeleton shimmer className="post-skel-chip is-wide" />
        </div>
      </div>
      <ListCard className="admin-rise" style={riseOrder(2)} inert>
        <PostListColumns
          sortBy="updatedAt"
          viewsSortable
          onSortByChange={() => {}}
        />
        <ListCardRows aria-busy="true">
          <PostRowsSkeleton />
        </ListCardRows>
      </ListCard>
    </div>
  );
}
