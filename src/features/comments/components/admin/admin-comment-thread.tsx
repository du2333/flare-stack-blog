import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { commentTargetOf } from "@/features/comments/comment-target";
import type {
  AdminComment,
  CommentWithUser,
} from "@/features/comments/comments.schema";
import { CommentAvatar } from "@/features/comments/components/comment-avatar";
import { CommentBody } from "@/features/comments/components/comment-body";
import {
  commentThreadQuery,
  threadRepliesQuery,
} from "@/features/comments/queries";
import { isMuted } from "@/features/muted-users/muted-users";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** How much of the conversation before the chosen Comment stays in sight. */
const CONTEXT_PEEK = 84;

/** One line of a conversation, from the queue's row or from the thread. */
interface Message {
  id: number;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  muted: boolean;
  deleted: boolean;
  content: string | null;
  createdAt: Date;
  /** Whom a reply answers. */
  replyToName: string | null;
  isReply: boolean;
}

function fromQueue(comment: AdminComment): Message {
  return {
    id: comment.id,
    name: comment.author.name,
    image: comment.author.image,
    isAdmin: comment.author.isAdmin,
    muted: comment.author.muted,
    deleted: false,
    content: comment.content,
    createdAt: comment.createdAt,
    replyToName: comment.replyToName,
    isReply: comment.rootId !== null,
  };
}

function fromThread(
  comment: CommentWithUser & { replyTo?: { name: string | null } | null },
): Message {
  return {
    id: comment.id,
    name: comment.user?.name ?? null,
    image: comment.user?.image ?? null,
    isAdmin: comment.user?.role === "admin",
    muted: isMuted(comment.user?.mutedAt),
    deleted: comment.status === "deleted",
    content: comment.content,
    createdAt: comment.createdAt,
    replyToName: comment.replyTo?.name ?? null,
    isReply: comment.rootId !== null,
  };
}

/**
 * The conversation a Comment belongs to, oldest first: its Root Comment and
 * the replies under it, with the chosen one set apart. The Comment itself
 * shows at once from the queue; the rest arrives around it. A Comment whose
 * Post is not public has no thread to read and stands alone.
 */
export function AdminCommentThread({
  comment,
  scroller,
}: {
  comment: AdminComment;
  /** The element the conversation scrolls in. */
  scroller: () => HTMLElement | null;
}) {
  const target = commentTargetOf(comment);
  const rootId = comment.rootId ?? comment.id;
  const readable = comment.commentPath !== null;
  const root = useQuery({
    ...commentThreadQuery(target, comment.id),
    enabled: readable,
  });
  const replies = useQuery({
    ...threadRepliesQuery(target, rootId),
    enabled: readable,
  });
  const currentRef = useRef<HTMLElement>(null);

  const loaded = root.data && replies.data;
  const thread = loaded
    ? [fromThread(root.data), ...replies.data.items.map(fromThread)]
    : null;
  // The thread may be cut short, or the Comment gone from it a moment ago.
  const messages = thread?.some((message) => message.id === comment.id)
    ? thread
    : [fromQueue(comment)];
  const waiting = readable && !loaded && (root.isPending || replies.isPending);

  // Start at the chosen Comment, with the end of what it answers above it.
  useLayoutEffect(() => {
    const box = scroller();
    const current = currentRef.current;
    if (!box || !current) return;
    box.scrollTop +=
      current.getBoundingClientRect().top -
      box.getBoundingClientRect().top -
      CONTEXT_PEEK;
    // `scroller` reads a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comment.id, loaded]);

  return (
    <div className="cmt-thread">
      {waiting && comment.rootId !== null ? (
        <div className="cmt-msg" aria-hidden="true">
          <Skeleton shimmer className="size-8 shrink-0 rounded-full" />
          <div className="cmt-msg-main">
            <Skeleton shimmer className="h-4 w-32 rounded" />
            <Skeleton shimmer className="mt-2 h-4 w-3/4 rounded" />
          </div>
        </div>
      ) : null}
      {messages.map((message) => {
        const current = message.id === comment.id;
        return (
          <article
            key={message.id}
            ref={current ? currentRef : undefined}
            className="cmt-msg"
            data-current={current ? "" : undefined}
            data-reply={message.isReply ? "" : undefined}
          >
            <CommentAvatar
              name={message.name}
              image={message.image}
              deleted={message.deleted}
            />
            <div className="cmt-msg-main">
              <header className="cmt-msg-by">
                <strong>
                  {message.deleted
                    ? m.comments_item_deleted_author()
                    : message.name || m.comments_item_anonymous()}
                </strong>
                {message.isAdmin && !message.deleted ? (
                  <Badge size="sm" tone="primary">
                    {m.comments_item_blogger()}
                  </Badge>
                ) : null}
                {message.muted && !message.deleted ? (
                  <Badge size="sm" tone="warning">
                    {m.admin_comments_state_muted()}
                  </Badge>
                ) : null}
                {message.isReply && message.replyToName && !message.deleted ? (
                  <span>
                    {m.comments_item_reply_to({ name: message.replyToName })}
                  </span>
                ) : null}
                <time dateTime={new Date(message.createdAt).toISOString()}>
                  <ClientOnly fallback="—">
                    {formatDate(message.createdAt, { includeTime: true })}
                  </ClientOnly>
                </time>
              </header>
              {message.deleted ? (
                <p className="cmt-msg-deleted">
                  {m.comments_item_deleted_content()}
                </p>
              ) : (
                <CommentBody
                  className="cmt-msg-text"
                  content={message.content}
                />
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
