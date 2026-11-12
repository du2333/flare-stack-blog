import { isDefinedError } from "@orpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Check,
  CheckCheck,
  ChevronRight,
  CornerDownRight,
  Reply,
  X,
} from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/input";
import {
  commentTargetOf,
  createCommentInput,
} from "@/features/comments/comment-target";
import { useComments } from "@/features/comments/hooks/use-comments";
import type {
  DashboardComment,
  DashboardOverview,
} from "@/features/dashboard/dashboard.schema";
import {
  refreshUnrepliedComments,
  useHandledComments,
} from "@/features/dashboard/hooks/use-handled-comments";
import { useAdminFriendLinks } from "@/features/friend-links/hooks/use-friend-links";
import { orpc } from "@/lib/orpc";
import { formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { OverviewCard } from "./overview-card";

/** How long a row takes to slide out (overview.css, .overview-item). */
const LEAVE_MS = 380;

/**
 * Rows that leave the list: a row slides out, then its change is sent. If
 * the change fails, the row comes back (the caller says why in a toast).
 * `gone` keeps a row hidden until the list's next load has dropped it.
 */
export function useLeavingRows() {
  const [leaving, setLeaving] = useState<ReadonlySet<number>>(new Set());
  const [gone, setGone] = useState<ReadonlySet<number>>(new Set());
  const without = (id: number) => (current: ReadonlySet<number>) => {
    const next = new Set(current);
    next.delete(id);
    return next;
  };
  const leave = (id: number, commit: () => Promise<unknown>) => {
    setLeaving((current) => new Set(current).add(id));
    window.setTimeout(() => {
      setGone((current) => new Set(current).add(id));
      commit().catch(() => {
        setGone(without(id));
        setLeaving(without(id));
      });
    }, LEAVE_MS);
  };
  return { leaving, gone, leave };
}

/** Moves focus to `fallback` when it is inside the row that leaves. */
function keepFocus(
  row: HTMLElement | null,
  fallback: RefObject<HTMLElement | null>,
) {
  if (row?.contains(document.activeElement))
    fallback.current?.focus({ preventScroll: true });
}

function hueOf(text: string) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

/** An avatar, or the name's first letter on a tint of its own. */
function Face({
  name,
  image,
  square,
}: {
  name: string;
  image: string | null;
  square?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={`overview-face ${square ? "is-square" : ""}`}
      style={{ "--h": hueOf(name) } as object}
      aria-hidden
    >
      {image && !broken ? (
        <img src={image} alt="" onError={() => setBroken(true)} />
      ) : (
        name.trim().slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/* ── Unreplied Comments ── */

/**
 * The latest Comments awaiting an Admin: reply in place (through Turnstile)
 * or mark one handled, with an undo in the toast. A Comment leaves the list
 * once it is answered either way; the Comments page has the rest.
 */
export function OverviewComments({
  comments,
  total,
}: {
  comments: Array<DashboardComment>;
  total: number;
}) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { leaving, gone, leave } = useLeavingRows();
  const { markHandledAsync } = useHandledComments();
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const replying = comments.find((comment) => comment.id === replyingId);
  const { createComment, isCreating } = useComments(
    replying ? commentTargetOf(replying) : undefined,
  );
  const {
    isPending: challengePending,
    reset: resetChallenge,
    turnstileProps,
  } = useTurnstile("comment");

  const shown = comments.filter((comment) => !gone.has(comment.id));
  const left =
    total - comments.filter((comment) => gone.has(comment.id)).length;

  const sendReply = async (
    comment: DashboardComment,
    row: HTMLElement | null,
  ) => {
    const content = (drafts[comment.id] ?? "").trim();
    if (!content || isCreating || challengePending) return;
    try {
      await createComment(
        createCommentInput(commentTargetOf(comment), {
          content,
          rootId: comment.rootId ?? comment.id,
          replyToCommentId: comment.id,
        }),
      );
    } catch {
      // The draft stays; the hook has said what went wrong.
      return;
    } finally {
      resetChallenge();
    }
    setDrafts(({ [comment.id]: _sent, ...rest }) => rest);
    setReplyingId(null);
    keepFocus(row, titleRef);
    toast.success(m.admin_overview_reply_sent());
    leave(comment.id, () => refreshUnrepliedComments(queryClient));
  };

  const markHandled = (comment: DashboardComment, row: HTMLElement | null) => {
    if (replyingId === comment.id) setReplyingId(null);
    keepFocus(row, titleRef);
    leave(comment.id, () => markHandledAsync(comment.id));
  };

  return (
    <OverviewCard
      title={m.dashboard_comments_title()}
      titleRef={titleRef}
      count={left}
      i={3}
      link={
        left > 0 ? (
          <Link
            className="overview-card-link"
            to="/admin/comments"
            search={{ view: "unreplied" }}
          >
            {m.admin_overview_all()}
            <ChevronRight size={14} aria-hidden />
          </Link>
        ) : undefined
      }
    >
      {shown.length === 0 ? (
        <p className="overview-empty">
          <CheckCheck size={20} aria-hidden />
          {left > 0
            ? m.admin_overview_comments_more({ count: left })
            : m.admin_overview_comments_done()}
        </p>
      ) : (
        <ul className="overview-list">
          {shown.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              leaving={leaving.has(comment.id)}
              replying={replyingId === comment.id}
              draft={drafts[comment.id] ?? ""}
              onDraftChange={(value) =>
                setDrafts((previous) => ({ ...previous, [comment.id]: value }))
              }
              sending={isCreating && replyingId === comment.id}
              challengePending={challengePending}
              challenge={
                replyingId === comment.id ? (
                  <Turnstile {...turnstileProps} size="compact" />
                ) : null
              }
              onReply={() =>
                setReplyingId(replyingId === comment.id ? null : comment.id)
              }
              onSend={(row) => void sendReply(comment, row)}
              onHandled={(row) => markHandled(comment, row)}
            />
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}

function CommentRow({
  comment,
  leaving,
  replying,
  draft,
  onDraftChange,
  sending,
  challengePending,
  challenge,
  onReply,
  onSend,
  onHandled,
}: {
  comment: DashboardComment;
  leaving: boolean;
  replying: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  sending: boolean;
  challengePending: boolean;
  challenge: ReactNode;
  onReply: () => void;
  onSend: (row: HTMLElement | null) => void;
  onHandled: (row: HTMLElement | null) => void;
}) {
  const name = comment.userName || m.admin_overview_activity_anonymous();
  const rowRef = useRef<HTMLLIElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const replyButton = useRef<HTMLButtonElement>(null);
  const wasReplying = useRef(replying);
  useEffect(() => {
    if (replying) boxRef.current?.focus({ preventScroll: true });
    // Closed while the box had focus: back to the button that opened it.
    else if (
      wasReplying.current &&
      rowRef.current?.contains(document.activeElement)
    )
      replyButton.current?.focus({ preventScroll: true });
    wasReplying.current = replying;
  }, [replying]);
  const canSend = Boolean(draft.trim()) && !challengePending;

  return (
    <li
      ref={rowRef}
      className="overview-item"
      data-leaving={leaving ? "" : undefined}
      inert={leaving}
    >
      <div>
        <div className="overview-cmt">
          <Face name={name} image={comment.userImage} />
          <div className="overview-cmt-body">
            <p className="overview-cmt-by">
              <b>{name}</b>
              <time dateTime={comment.createdAt.toISOString()}>
                {formatTimeAgo(comment.createdAt)}
              </time>
            </p>
            <p className="overview-cmt-text">{comment.snippet}</p>
            <p className="overview-cmt-src">
              <CornerDownRight size={13} aria-hidden />
              <span>{comment.postTitle ?? comment.momentTitle}</span>
            </p>
          </div>
          <div className="overview-acts">
            <Button
              ref={replyButton}
              variant="quiet"
              size="xs"
              icon={<Reply size={14} />}
              aria-expanded={replying}
              onClick={onReply}
            >
              {m.comments_item_reply()}
            </Button>
            <IconButton
              variant="quiet"
              size="xs"
              label={m.dashboard_comment_mark_handled()}
              onClick={() => onHandled(rowRef.current)}
            >
              <Check size={15} />
            </IconButton>
          </div>
        </div>
        <div className="overview-reply" data-open={replying ? "" : undefined}>
          <div inert={!replying}>
            <div className="overview-reply-box">
              <Textarea
                ref={boxRef}
                bare
                value={draft}
                aria-label={m.comments_item_reply_to({ name })}
                placeholder={m.admin_overview_reply_placeholder({ name })}
                disabled={sending}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onReply();
                  }
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey) &&
                    canSend
                  ) {
                    event.preventDefault();
                    onSend(rowRef.current);
                  }
                }}
              />
              <div className="overview-reply-foot">
                <span>{m.admin_overview_reply_hint()}</span>
                {challenge}
                <Button variant="quiet" size="xs" onClick={onReply}>
                  {m.comments_editor_cancel()}
                </Button>
                <Button
                  variant="ink"
                  size="xs"
                  disabled={!canSend}
                  loading={sending}
                  onClick={() => onSend(rowRef.current)}
                >
                  {m.admin_overview_reply_send()}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ── Friend Links waiting for review ── */

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** The first Friend Link applications, to approve or reject in place. */
export function OverviewFriendLinks({
  pending,
}: {
  pending: DashboardOverview["pendingFriendLinks"];
}) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { leaving, gone, leave } = useLeavingRows();
  const { approveAsync, rejectAsync } = useAdminFriendLinks();
  const shown = pending.items.filter((item) => !gone.has(item.id));
  const left =
    pending.items.length +
    pending.remainingCount -
    pending.items.filter((item) => gone.has(item.id)).length;
  if (pending.items.length === 0) return null;

  const review = (
    id: number,
    row: HTMLElement | null,
    send: () => Promise<unknown>,
  ) => {
    keepFocus(row, titleRef);
    leave(id, async () => {
      try {
        await send();
      } catch (error) {
        // A missing link has its own toast; anything else gets this one.
        if (!isDefinedError(error))
          toast.error(m.dashboard_comment_handled_error());
        throw error;
      }
      await queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
    });
  };

  return (
    <OverviewCard
      title={m.admin_overview_links_title()}
      titleRef={titleRef}
      count={left}
      i={4}
      link={
        <Link
          className="overview-card-link"
          to="/admin/friend-links"
          search={{ status: "pending", page: 1 }}
        >
          {m.admin_overview_all()}
          <ChevronRight size={14} aria-hidden />
        </Link>
      }
    >
      {shown.length === 0 ? (
        <p className="overview-empty">
          <CheckCheck size={20} aria-hidden />
          {left > 0
            ? m.admin_overview_links_more({ count: left })
            : m.admin_overview_links_done()}
        </p>
      ) : (
        <ul className="overview-list">
          {shown.slice(0, 3).map((item) => (
            <FriendLinkRow
              key={item.id}
              item={item}
              leaving={leaving.has(item.id)}
              onReject={(row) =>
                review(item.id, row, () => rejectAsync({ id: item.id }))
              }
              onApprove={(row) =>
                review(item.id, row, () => approveAsync({ id: item.id }))
              }
            />
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}

function FriendLinkRow({
  item,
  leaving,
  onReject,
  onApprove,
}: {
  item: DashboardOverview["pendingFriendLinks"]["items"][number];
  leaving: boolean;
  onReject: (row: HTMLElement | null) => void;
  onApprove: (row: HTMLElement | null) => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  return (
    <li
      ref={rowRef}
      className="overview-item"
      data-leaving={leaving ? "" : undefined}
      inert={leaving}
    >
      <div>
        <div className="overview-link">
          <Face name={item.siteName} image={item.logoUrl} square />
          <p className="overview-link-copy">
            <b>{item.siteName}</b>
            <span>{hostOf(item.siteUrl)}</span>
          </p>
          <IconButton
            variant="quiet"
            size="xs"
            label={m.admin_overview_link_reject({ name: item.siteName })}
            onClick={() => onReject(rowRef.current)}
          >
            <X size={15} />
          </IconButton>
          <Button
            variant="outline"
            size="xs"
            className="overview-approve"
            icon={<Check size={14} />}
            aria-label={m.admin_overview_link_approve({ name: item.siteName })}
            onClick={() => onApprove(rowRef.current)}
          >
            {m.friend_links_action_pass()}
          </Button>
        </div>
      </div>
    </li>
  );
}
