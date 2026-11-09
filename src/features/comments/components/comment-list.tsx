import { useInfiniteQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { CommentTarget } from "@/features/comments/comment-target";
import { remainingPublishedReplies } from "@/features/comments/comment-thread";
import type { RootCommentWithReplyCount } from "@/features/comments/comments.schema";
import { repliesByRootIdInfiniteQuery } from "@/features/comments/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Callout } from "@/components/ui/callout";
import { m } from "@/paraglide/messages";
import { CommentItem } from "./comment-item";
import { CommentReveal } from "./comment-reveal";

interface CommentListProps {
  rootComments: RootCommentWithReplyCount[];
  target: CommentTarget;
  onReply: (rootId: number, commentId: number, userName: string) => void;
  onDelete?: (commentId: number) => void;
  onMute?: (userId: string, userName: string) => void;
  onUnmute?: (userId: string, userName: string) => void;
  canReply?: boolean;
  replyTarget?: { rootId: number; commentId: number; userName: string } | null;
  replyEditor?: ReactNode;
  revealRootId?: number;
  revealCommentId?: number;
}
export function CommentList({ rootComments, ...props }: CommentListProps) {
  if (!rootComments.length)
    return <EmptyState size="compact" description={m.comments_list_empty()} />;
  return (
    <div className="comment-list">
      {rootComments.map((root) => (
        <CommentThread key={root.id} root={root} {...props} />
      ))}
    </div>
  );
}
function CommentThread({
  root,
  target,
  onReply,
  onDelete,
  onMute,
  onUnmute,
  canReply,
  replyTarget,
  replyEditor,
  revealRootId,
  revealCommentId,
}: Omit<CommentListProps, "rootComments"> & {
  root: RootCommentWithReplyCount;
}) {
  const needsReveal =
    revealRootId === root.id &&
    revealCommentId !== root.id &&
    !root.replies.some((reply) => reply.id === revealCommentId);
  const [expanded, setExpanded] = useState(needsReveal);
  useEffect(() => {
    if (needsReveal) setExpanded(true);
  }, [needsReveal, revealCommentId]);
  const query = useInfiniteQuery({
    ...repliesByRootIdInfiniteQuery(target, root.id),
    enabled: expanded,
  });
  const fetched = query.data?.pages.flatMap((page) => page.items) ?? [];
  const replies = expanded && fetched.length ? fetched : root.replies;
  const remaining = remainingPublishedReplies(root.replyCount, replies);
  const preview = replies.slice(0, root.replies.length);
  const extra = replies.slice(root.replies.length);
  const highlighted = revealRootId === root.id ? revealCommentId : undefined;
  useEffect(() => {
    if (
      expanded &&
      !query.isError &&
      revealRootId === root.id &&
      revealCommentId !== root.id &&
      !replies.some((reply) => reply.id === revealCommentId) &&
      query.hasNextPage &&
      !query.isFetching
    )
      void query.fetchNextPage();
  }, [
    expanded,
    query.isError,
    query.hasNextPage,
    query.isFetching,
    query.fetchNextPage,
    replies,
    revealRootId,
    revealCommentId,
    root.id,
  ]);
  const itemProps = {
    onReply,
    onDelete,
    onMute,
    onUnmute,
    canReply,
    highlightCommentId: highlighted,
  };
  const renderReply = (reply: RootCommentWithReplyCount["replies"][number]) => (
    <div key={reply.id}>
      <CommentItem
        comment={reply}
        {...itemProps}
        isReply
        replyToName={reply.replyTo?.name}
      />
      <CommentReveal
        open={
          replyTarget?.rootId === root.id && replyTarget.commentId === reply.id
        }
        className="comment-inline-reply"
      >
        {replyEditor}
      </CommentReveal>
    </div>
  );
  return (
    <section className="comment-thread">
      <CommentItem comment={root} {...itemProps} />
      <CommentReveal
        open={
          replyTarget?.rootId === root.id && replyTarget.commentId === root.id
        }
        className="comment-root-reply"
      >
        {replyEditor}
      </CommentReveal>
      {(replies.length > 0 || remaining > 0) && (
        <div className="comment-replies">
          {preview.map(renderReply)}
          <CommentReveal open={expanded && extra.length > 0}>
            {extra.map(renderReply)}
          </CommentReveal>
          {expanded && query.isError && (
            <Callout
              className="comment-load-error"
              tone="danger"
              icon={CircleAlert}
              role="alert"
              action={
                <Button
                  variant="text"
                  size="sm"
                  onClick={() =>
                    void (query.isFetchNextPageError
                      ? query.fetchNextPage()
                      : query.refetch())
                  }
                  disabled={query.isFetching}
                >
                  {m.comments_retry()}
                </Button>
              }
            >
              {m.comments_replies_failed()}
            </Callout>
          )}
          {expanded && !query.isError && query.isFetching && (
            <p className="comment-load-state" role="status">
              {m.comments_loading()}
            </p>
          )}
          {expanded && remaining > 0 && query.hasNextPage && !query.isError && (
            <Button
              variant="text"
              size="sm"
              className="comment-thread-toggle"
              onClick={() => void query.fetchNextPage()}
              disabled={query.isFetching}
            >
              {m.comments_list_load_more_replies()}
            </Button>
          )}
          {(expanded || remaining > 0) && (
            <Button
              variant="text"
              size="sm"
              className="comment-thread-toggle"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded
                ? m.comments_list_collapse_replies()
                : m.comments_list_expand_replies({ count: remaining })}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
