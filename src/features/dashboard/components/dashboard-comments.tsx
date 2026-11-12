import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/page-heading";
import type { DashboardComment } from "@/features/dashboard/dashboard.schema";
import { useHandledComments } from "@/features/dashboard/hooks/use-handled-comments";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { UnrepliedCommentList } from "./unreplied-comment-list";

/**
 * The latest Comments awaiting an Admin (the overview loads
 * DASHBOARD_UNREPLIED_COMMENTS_LIMIT of them), with reply, mark handled,
 * delete and mute at hand; the Comments page has the rest. A Comment leaves
 * the list once an Admin replies to it or marks it handled.
 */
export function DashboardComments({
  comments,
  total,
  className,
}: {
  comments: Array<DashboardComment>;
  total: number;
  className?: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { markHandled } = useHandledComments();

  return (
    <section className={cn("dashboard-section dashboard-comments", className)}>
      <SectionHeading
        size="md"
        title={m.dashboard_comments_title()}
        titleProps={{ ref: headingRef, tabIndex: -1 }}
        actions={
          total > 0 ? (
            <Link
              to="/admin/comments"
              search={{ view: "unreplied" }}
              className={buttonClass({ variant: "text", size: "sm" })}
            >
              {m.dashboard_unreplied_all({ count: total })}
              <ArrowRight size={16} />
            </Link>
          ) : undefined
        }
      />
      {comments.length === 0 ? (
        <EmptyState size="compact" description={m.dashboard_comments_empty()} />
      ) : (
        <UnrepliedCommentList
          comments={comments}
          onMarkHandled={markHandled}
          fallbackFocus={() => headingRef.current}
        />
      )}
    </section>
  );
}
