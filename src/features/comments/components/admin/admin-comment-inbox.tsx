import { ClientOnly } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  ExternalLink,
  Trash2,
  Undo2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { AdminSplit } from "@/components/admin/admin-page";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { PickRow } from "@/components/ui/pick-row";
import {
  commentTargetOf,
  createCommentInput,
} from "@/features/comments/comment-target";
import type {
  AdminComment,
  AdminCommentView,
} from "@/features/comments/comments.schema";
import { CommentAvatar } from "@/features/comments/components/comment-avatar";
import {
  useAdminCommentActions,
  useRefreshAdminComments,
} from "@/features/comments/hooks/use-admin-comment-actions";
import { useComments } from "@/features/comments/hooks/use-comments";
import { useMutedUsers } from "@/features/muted-users/hooks/use-muted-users";
import { useContentMotion, useMediaQuery } from "@/hooks/use-motion";
import { useSession } from "@/lib/auth/auth-client";
import { formatDate, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { AdminCommentThread } from "./admin-comment-thread";

type PendingAction =
  | { kind: "delete"; comment: AdminComment }
  | { kind: "mute" | "unmute"; comment: AdminComment; userId: string };

/** Where the queue and the conversation stack (admin-page.css). */
const STACKED_QUERY = "(max-width: 767px)";

/** The author's name as the page shows it. */
export function authorName(comment: AdminComment) {
  return comment.author.name || m.comments_item_anonymous();
}

/**
 * Bring `element` into `scroller`'s view by moving only that scroller, and
 * only up or down: `scrollIntoView` would also shift the split's panes
 * sideways while one of them waits off to the side on a phone.
 */
function revealWithin(
  scroller: HTMLElement | null,
  element: Element | null | undefined,
  margin = 8,
) {
  if (!scroller || !element) return;
  const box = scroller.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (rect.top < box.top + margin)
    scroller.scrollTop -= box.top + margin - rect.top;
  else if (rect.bottom > box.bottom - margin)
    scroller.scrollTop += Math.min(
      rect.bottom - box.bottom + margin,
      rect.top - box.top - margin,
    );
}

/** Typing, or a popup is open: the page's single-key shortcuts stay out. */
function shortcutsBlocked(target: EventTarget | null) {
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.matches("input, textarea, select, [role='tab'], [role='option']"))
  )
    return true;
  return Boolean(
    document.querySelector(
      "[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox']",
    ),
  );
}

/**
 * The Comments page as an inbox: the page's Comments in a queue on the left,
 * the conversation the chosen one belongs to on the right with a reply box
 * under it. Replying (as the Admin, whom the API does not challenge) or marking a Comment handled takes it off
 * the unreplied queue at once and moves on to the next; delete and mute ask
 * first. J and K (or the arrows, in the queue) move, R replies, E marks
 * handled.
 */
export function AdminCommentInbox({
  comments,
  view,
  resetKey,
  foot,
  done,
}: {
  comments: Array<AdminComment>;
  view: AdminCommentView;
  /** Changes with the view, page, search and Post: the choice starts over. */
  resetKey: string;
  /** Under the queue: its pages. */
  foot?: ReactNode;
  /** Shown once every Comment of the page has left the unreplied queue. */
  done: ReactNode;
}) {
  const { data: session } = useSession();
  const stacked = useMediaQuery(STACKED_QUERY);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [left, setLeft] = useState<ReadonlySet<number>>(new Set());
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<PendingAction | null>(null);
  const lastIndex = useRef(0);
  const queueRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  // What the server says now replaces what was taken off ahead of it.
  useEffect(() => setLeft(new Set()), [comments]);
  useEffect(() => {
    lastIndex.current = 0;
    setSelectedId(null);
    setDetailOpen(false);
    queueRef.current?.scrollTo({ top: 0 });
  }, [resetKey]);

  const shown = comments.filter((comment) => !left.has(comment.id));
  const selected =
    shown.find((comment) => comment.id === selectedId) ??
    shown[Math.min(lastIndex.current, shown.length - 1)];
  const index = selected ? shown.indexOf(selected) : -1;
  // Stacked and still on the queue: nothing is chosen yet, so nothing is lit.
  const highlighted = selected && !(stacked && !detailOpen) ? selected : null;

  const target = pending?.comment ?? selected;
  const targetPage = target ? commentTargetOf(target) : undefined;
  const { createComment, deleteComment, isCreating, isDeleting } =
    useComments(targetPage);
  const { muteUser, unmuteUser, isMuting, isUnmuting } = useMutedUsers(
    targetPage,
    { linkMutedList: true },
  );
  const { markHandled, unmarkHandled } = useAdminCommentActions();
  const refresh = useRefreshAdminComments();
  useContentMotion(detailRef, String(selected?.id));
  useEffect(() => {
    if (detailOpen && stacked) backRef.current?.focus();
  }, [detailOpen, stacked]);
  // The chosen row stays in sight as the keys move through the queue.
  useLayoutEffect(() => {
    revealWithin(
      queueRef.current,
      queueRef.current?.querySelector("[aria-current='true']"),
    );
  }, [highlighted?.id]);

  const choose = (comment: AdminComment, open = true) => {
    lastIndex.current = shown.indexOf(comment);
    setSelectedId(comment.id);
    if (open) setDetailOpen(true);
  };
  const step = (delta: number) => {
    const next = shown[index + delta];
    if (next) choose(next, false);
  };
  /** Off the unreplied queue now; the next one takes its place. */
  const leave = (comment: AdminComment) => {
    if (view !== "unreplied") return;
    lastIndex.current = Math.max(0, index);
    setSelectedId(null);
    setLeft((previous) => new Set(previous).add(comment.id));
  };
  const handle = (comment: AdminComment) => {
    leave(comment);
    markHandled(comment.id);
  };
  const canReply = (comment: AdminComment) =>
    // A Post that is not public takes no Comments, so no reply either.
    comment.commentPath !== null && !comment.author.isAdmin;

  const draft = selected ? (drafts[selected.id] ?? "") : "";
  const canSend = Boolean(draft.trim()) && !isCreating;
  const send = async () => {
    if (!selected || !canSend) return;
    const comment = selected;
    try {
      await createComment(
        createCommentInput(commentTargetOf(comment), {
          content: draft.trim(),
          rootId: comment.rootId ?? comment.id,
          replyToCommentId: comment.id,
        }),
      );
    } catch {
      // The draft stays; the hook has said what went wrong.
      return;
    }
    setDrafts(({ [comment.id]: _sent, ...rest }) => rest);
    toast.success(m.admin_comments_reply_sent());
    leave(comment);
    void refresh();
  };

  const confirmPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === "delete")
        await deleteComment({ id: pending.comment.id });
      else if (pending.kind === "mute")
        await muteUser({ userId: pending.userId });
      else await unmuteUser({ userId: pending.userId });
    } catch {
      // The hook has said what went wrong; the dialog stays for a retry.
      return;
    }
    setPending(null);
    await refresh();
  };
  const returnFocus = () =>
    trigger.current?.isConnected ? trigger.current : detailRef.current;

  // The page's keys. The latest handler is read through a ref, so the
  // listener is bound once.
  const keys = useRef<(event: KeyboardEvent) => void>(() => {});
  keys.current = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (shortcutsBlocked(event.target)) return;
    const inQueue =
      event.target instanceof Node && queueRef.current?.contains(event.target);
    const key = event.key.toLowerCase();
    if (key === "j" || (inQueue && key === "arrowdown")) step(1);
    else if (key === "k" || (inQueue && key === "arrowup")) step(-1);
    else if (key === "r" && selected && canReply(selected))
      boxRef.current?.focus();
    else if (key === "e" && selected?.awaitingReply) handle(selected);
    else return;
    event.preventDefault();
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keys.current(event);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (shown.length === 0) return done;

  const menuFor = (comment: AdminComment) => {
    const items: Array<ActionMenuItem> = [];
    if (comment.handled && !comment.answered)
      items.push({
        label: m.admin_comments_unmark_handled(),
        icon: Undo2,
        onSelect: () => unmarkHandled(comment.id),
      });
    items.push({
      label: m.comments_item_delete(),
      icon: Trash2,
      danger: true,
      separator: items.length > 0,
      onSelect: (button) => {
        trigger.current = button;
        setPending({ kind: "delete", comment });
      },
    });
    const userId = comment.author.id;
    if (userId && userId !== session?.user.id && !comment.author.isAdmin)
      items.push(
        comment.author.muted
          ? {
              label: m.admin_comments_unmute(),
              icon: UserCheck,
              onSelect: (button) => {
                trigger.current = button;
                setPending({ kind: "unmute", comment, userId });
              },
            }
          : {
              label: m.admin_comments_mute(),
              icon: UserX,
              danger: true,
              onSelect: (button) => {
                trigger.current = button;
                setPending({ kind: "mute", comment, userId });
              },
            },
      );
    return items;
  };

  const pendingName = pending ? authorName(pending.comment) : "";
  return (
    <>
      <AdminSplit
        className="cmt-inbox"
        detailOpen={detailOpen && Boolean(selected)}
        listLabel={m.admin_comments_queue()}
        detailLabel={m.admin_comments_conversation()}
        list={
          <>
            <div className="cmt-queue custom-scrollbar" ref={queueRef}>
              {shown.map((comment) => (
                <QueueRow
                  key={comment.id}
                  comment={comment}
                  showState={view === "all"}
                  chosen={selected?.id === comment.id}
                  current={highlighted?.id === comment.id}
                  onChoose={() => choose(comment)}
                />
              ))}
            </div>
            {foot ? <div className="cmt-queue-foot">{foot}</div> : null}
          </>
        }
        detail={
          selected ? (
            <>
              <header className="cmt-detail-head">
                <IconButton
                  ref={backRef}
                  className="cmt-back"
                  variant="quiet"
                  size="sm"
                  label={m.admin_comments_queue()}
                  onClick={() => {
                    setDetailOpen(false);
                    requestAnimationFrame(() =>
                      queueRef.current
                        ?.querySelector<HTMLElement>("[data-chosen]")
                        ?.focus(),
                    );
                  }}
                >
                  <ArrowLeft size={17} />
                </IconButton>
                <Source comment={selected} />
                <div className="cmt-detail-tools">
                  <span className="cmt-position">
                    {index + 1} / {shown.length}
                  </span>
                  <IconButton
                    className="cmt-step"
                    variant="quiet"
                    size="sm"
                    label={`${m.admin_comments_previous()} (K)`}
                    disabled={index <= 0}
                    onClick={() => step(-1)}
                  >
                    <ChevronUp size={17} />
                  </IconButton>
                  <IconButton
                    className="cmt-step"
                    variant="quiet"
                    size="sm"
                    label={`${m.admin_comments_next()} (J)`}
                    disabled={index >= shown.length - 1}
                    onClick={() => step(1)}
                  >
                    <ChevronDown size={17} />
                  </IconButton>
                  {selected.awaitingReply ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="cmt-handle"
                      icon={<Check size={15} />}
                      onClick={() => handle(selected)}
                    >
                      {m.admin_comments_mark_handled()}
                      <Kbd>E</Kbd>
                    </Button>
                  ) : null}
                  <ActionMenu
                    items={menuFor(selected)}
                    label={m.comments_more_actions()}
                    placement="bottom-end"
                  />
                </div>
              </header>
              <div
                className="cmt-detail-scroll custom-scrollbar"
                ref={detailRef}
                tabIndex={-1}
              >
                <AdminCommentThread
                  comment={selected}
                  scroller={() => detailRef.current}
                />
                {canReply(selected) ? (
                  <div className="cmt-reply">
                    <div className="cmt-reply-box">
                      <Textarea
                        ref={boxRef}
                        bare
                        autoGrow
                        rows={2}
                        maxRows={10}
                        value={draft}
                        aria-label={m.comments_item_reply_to({
                          name: authorName(selected),
                        })}
                        placeholder={m.admin_overview_reply_placeholder({
                          name: authorName(selected),
                        })}
                        disabled={isCreating}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [selected.id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (
                            event.key === "Enter" &&
                            (event.metaKey || event.ctrlKey)
                          ) {
                            event.preventDefault();
                            void send();
                          }
                        }}
                      />
                      <div className="cmt-reply-foot">
                        <span className="cmt-reply-hint">
                          <Kbd>R</Kbd>
                          {m.comments_item_reply()}
                          <Kbd>Ctrl ↵</Kbd>
                          {m.admin_overview_reply_send()}
                        </span>
                        <Button
                          variant="ink"
                          size="sm"
                          disabled={!canSend}
                          loading={isCreating}
                          onClick={() => void send()}
                        >
                          {m.admin_overview_reply_send()}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : selected.commentPath === null ? (
                  <p className="cmt-reply-none">
                    {m.admin_comments_reply_private()}
                  </p>
                ) : null}
              </div>
            </>
          ) : null
        }
      />
      <ConfirmationModal
        isOpen={pending?.kind === "delete"}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        title={m.comments_delete_title()}
        message={m.comments_delete_desc()}
        confirmLabel={m.comments_delete_confirm()}
        isDanger
        isLoading={isDeleting}
        returnFocus={returnFocus}
      />
      <ConfirmationModal
        isOpen={pending?.kind === "mute"}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        title={m.comments_mute_title()}
        message={m.comments_mute_desc({ name: pendingName })}
        confirmLabel={m.comments_mute_confirm()}
        isDanger
        isLoading={isMuting}
        returnFocus={returnFocus}
      />
      <ConfirmationModal
        isOpen={pending?.kind === "unmute"}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        title={m.comments_unmute_title()}
        message={m.comments_unmute_desc({ name: pendingName })}
        confirmLabel={m.comments_unmute_confirm()}
        isLoading={isUnmuting}
        returnFocus={returnFocus}
      />
    </>
  );
}

/** One Comment in the queue: who, when, the start of it and where it is. */
function QueueRow({
  comment,
  showState,
  chosen,
  current,
  onChoose,
}: {
  comment: AdminComment;
  /** In the 全部 view: mark what still waits and what was dealt with. */
  showState: boolean;
  /** The one the conversation pane shows, lit (`current`) or not. */
  chosen: boolean;
  current: boolean;
  onChoose: () => void;
}) {
  const state = comment.answered
    ? m.admin_comments_state_replied()
    : comment.handled
      ? m.admin_comments_state_handled()
      : null;
  return (
    <PickRow
      className="cmt-row"
      chosen={chosen}
      current={current}
      data-waiting={showState && comment.awaitingReply ? "" : undefined}
      onClick={onChoose}
    >
      <CommentAvatar name={comment.author.name} image={comment.author.image} />
      <span className="cmt-row-main">
        <span className="cmt-row-top">
          <strong>{authorName(comment)}</strong>
          {comment.author.isAdmin ? (
            <Badge size="sm" tone="primary">
              {m.comments_item_blogger()}
            </Badge>
          ) : null}
          <time
            dateTime={new Date(comment.createdAt).toISOString()}
            title={formatDate(comment.createdAt)}
          >
            <ClientOnly fallback="—">
              {formatTimeAgo(comment.createdAt)}
            </ClientOnly>
          </time>
        </span>
        <span className="cmt-row-text">{comment.content}</span>
        <span className="cmt-row-src">
          <CornerDownRight size={12} aria-hidden="true" />
          <span>{comment.pageTitle}</span>
          {showState && state ? <em>{state}</em> : null}
        </span>
      </span>
    </PickRow>
  );
}

/** The Post or Moment the conversation is on; it opens there in a new tab. */
function Source({ comment }: { comment: AdminComment }) {
  const moment =
    comment.momentId !== null ? (
      <Badge size="sm">{m.admin_comments_source_moment()}</Badge>
    ) : null;
  if (!comment.commentPath)
    return (
      <p className="cmt-source">
        {moment}
        <span>{comment.pageTitle}</span>
        <Badge size="sm">{m.admin_comments_source_private()}</Badge>
      </p>
    );
  return (
    <a
      className="cmt-source"
      href={comment.commentPath}
      target="_blank"
      rel="noopener"
      aria-label={m.admin_comments_source_open({ title: comment.pageTitle })}
    >
      {moment}
      <span>{comment.pageTitle}</span>
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}
