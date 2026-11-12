import { ClientOnly } from "@tanstack/react-router";
import { ExternalLink, MessageSquareReply } from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminComment } from "@/features/comments/comments.schema";
import { CommentAvatar } from "@/features/comments/components/comment-avatar";
import { CommentBody } from "@/features/comments/components/comment-body";
import { formatDate, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** The author's name as the page shows it. */
export function authorName(comment: AdminComment) {
  return comment.author.name || m.comments_item_anonymous();
}

/**
 * One Comment as a line of conversation: who wrote it and when, whether an
 * Admin dealt with it, its body (two lines, expandable in place) and the Post
 * or Moment it is on, which opens the public page at the Comment in a new
 * tab. Reply is a quiet button at the end, the rest of the actions sit in
 * the menu beside it; on a phone Reply joins the menu (`replyInMenu`).
 */
export function AdminCommentRow({
  comment,
  actions,
  onReply,
  replying,
  replyInMenu,
  children,
}: {
  comment: AdminComment;
  actions: Array<ActionMenuItem>;
  /** Null when the Comment cannot be answered (its Post is not public). */
  onReply: ((trigger: HTMLButtonElement) => void) | null;
  replying: boolean;
  replyInMenu: boolean;
  /** The reply editor, under the row. */
  children?: ReactNode;
}) {
  const name = authorName(comment);
  const items: Array<ActionMenuItem> =
    replyInMenu && onReply
      ? [
          {
            label: m.comments_item_reply(),
            icon: MessageSquareReply,
            onSelect: onReply,
          },
          ...actions,
        ]
      : actions;
  const state = comment.answered
    ? m.admin_comments_state_replied()
    : comment.handled
      ? m.admin_comments_state_handled()
      : null;

  return (
    <li className="admin-comment" data-replying={replying ? "" : undefined}>
      <div className="admin-comment-row">
        <CommentAvatar
          name={comment.author.name}
          image={comment.author.image}
        />
        <div className="admin-comment-main">
          <div className="admin-comment-byline">
            <strong className="admin-comment-author">{name}</strong>
            {comment.author.isAdmin ? (
              <Badge size="sm" tone="primary">
                {m.comments_item_blogger()}
              </Badge>
            ) : null}
            <time
              className="admin-comment-time"
              dateTime={new Date(comment.createdAt).toISOString()}
              title={formatDate(comment.createdAt)}
            >
              <ClientOnly fallback="—">
                {formatTimeAgo(comment.createdAt)}
              </ClientOnly>
            </time>
            {state ? <Badge size="sm">{state}</Badge> : null}
            {comment.author.muted ? (
              <Badge size="sm" tone="warning">
                {m.admin_comments_state_muted()}
              </Badge>
            ) : null}
          </div>
          <ClampedBody comment={comment} />
        </div>
        <div className="admin-comment-actions">
          {onReply && !replyInMenu ? (
            <Button
              variant="plain"
              size="sm"
              icon={<MessageSquareReply size={15} />}
              aria-expanded={replying}
              onClick={(event) => onReply(event.currentTarget)}
            >
              {m.comments_item_reply()}
            </Button>
          ) : null}
          <ActionMenu
            items={items}
            label={m.comments_more_actions()}
            placement="bottom-end"
          />
        </div>
      </div>
      {children}
    </li>
  );
}

/** The body at two lines with the page under it; a longer body opens in place. */
function ClampedBody({ comment }: { comment: AdminComment }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || expanded) return;
    const measure = () =>
      setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [comment.content, expanded]);

  return (
    <>
      <div
        ref={textRef}
        id={id}
        className="admin-comment-text"
        data-expanded={expanded ? "" : undefined}
      >
        {comment.rootId !== null ? (
          <span className="admin-comment-reply-to">
            {m.comments_item_reply_to({
              name: comment.replyToName || m.comments_item_anonymous(),
            })}
          </span>
        ) : null}
        <CommentBody content={comment.content} />
      </div>
      <div className="admin-comment-meta">
        <CommentSource comment={comment} />
        {overflows || expanded ? (
          <Button
            variant="text"
            size="sm"
            className="admin-comment-expand"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? m.common_collapse() : m.common_expand_all()}
          </Button>
        ) : null}
      </div>
    </>
  );
}

function CommentSource({ comment }: { comment: AdminComment }) {
  const moment =
    comment.momentId !== null ? (
      <Badge size="sm">{m.admin_comments_source_moment()}</Badge>
    ) : null;
  if (!comment.commentPath) {
    return (
      <span className="admin-comment-source">
        <span className="admin-comment-source-title">{comment.pageTitle}</span>
        <span>· {m.admin_comments_source_private()}</span>
      </span>
    );
  }
  return (
    <a
      className="admin-comment-source"
      href={comment.commentPath}
      target="_blank"
      rel="noopener"
      aria-label={m.admin_comments_source_open({ title: comment.pageTitle })}
    >
      {moment}
      <span className="admin-comment-source-title">{comment.pageTitle}</span>
      <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}
