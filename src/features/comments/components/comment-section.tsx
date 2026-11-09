import { useMediaQuery } from "@/hooks/use-motion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "@tanstack/react-router";
import { CircleAlert, LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { Button, buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useComments } from "@/features/comments/hooks/use-comments";
import { useCommentComposer } from "@/features/comments/hooks/use-comment-composer";
import { useMutedUsers } from "@/features/muted-users/hooks/use-muted-users";
import { useScrollToComment } from "@/features/comments/hooks/use-scroll-to-comment";
import type { CommentTarget } from "@/features/comments/comment-target";
import {
  commentThreadQuery,
  rootCommentsInfiniteQuery,
} from "@/features/comments/queries";
import { useSession } from "@/lib/auth/auth-client";
import { Callout } from "@/components/ui/callout";
import { m } from "@/paraglide/messages";
import { CommentConfirmationModal } from "./comment-confirmation-modal";
import { CommentEditor } from "./comment-editor";
import { CommentList } from "./comment-list";
import { CommentReveal } from "./comment-reveal";
import { CommentAvatar } from "./comment-avatar";
import "./comments.css";

const LOCATE_TOAST = "locate-comment";
const LOCATE_DELAY_MS = 300;

interface CommentSectionProps {
  /** The Post or the Moment whose Comments this section shows. */
  target: CommentTarget;
}

/**
 * A Post's or a Moment's Comments (ADR 0037): the same section for both,
 * reading `?comment=` from whichever page it sits on (ADR 0015).
 */
export function CommentSection({ target }: CommentSectionProps) {
  const { data: session } = useSession();
  const commentId = useSearch({
    strict: false,
    select: (search) => (search as { comment?: number }).comment,
  });
  const listQuery = useInfiniteQuery(rootCommentsInfiniteQuery(target));
  const {
    data,
    isPending: isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = listQuery;
  const location = useLocation();
  const compactChallenge = useMediaQuery("(max-width: 380px)");
  const threadQuery = useQuery({
    ...commentThreadQuery(target, commentId ?? 0),
    enabled: commentId != null,
  });

  const listed = data?.pages.flatMap((page) => page.items) ?? [];
  const thread = threadQuery.data;
  const rootComments =
    thread && !listed.some((root) => root.id === thread.id)
      ? [...listed, thread]
      : listed;
  const totalCount = data?.pages[0]?.total ?? 0;

  const [locallyMuted, setLocallyMuted] = useState(false);
  const { createComment, deleteComment, isCreating, isDeleting } = useComments(
    target,
    { onMuted: () => setLocallyMuted(true) },
  );
  const { muteUser, unmuteUser, isMuting, isUnmuting } = useMutedUsers(target);

  const [localReveal, setLocalReveal] = useState<{
    rootId: number;
    commentId: number;
  } | null>(null);
  useEffect(() => {
    // A new URL target takes precedence over the last comment sent locally.
    setLocalReveal(null);
  }, [commentId]);
  const reveal =
    localReveal ??
    (thread && commentId != null ? { rootId: thread.id, commentId } : null);

  useEffect(() => {
    setLocalReveal(null);
    setLocallyMuted(false);
  }, [target.type, target.id, session?.user.id]);
  const loginReturn = (id?: number) => {
    const params = new URLSearchParams(location.searchStr);
    if (id != null) params.set("comment", String(id));
    return `${location.pathname}${params.size ? `?${params}` : ""}#comments`;
  };

  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [pendingMute, setPendingMute] = useState<{
    kind: "mute" | "unmute";
    userId: string;
    userName: string;
  } | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const {
    isPending: turnstilePending,
    reset: resetTurnstile,
    turnstileProps,
  } = useTurnstile("comment");

  useScrollToComment(
    localReveal?.commentId ?? (threadQuery.isSuccess ? commentId : undefined),
  );

  useEffect(() => {
    if (commentId == null || threadQuery.isSuccess || threadQuery.isError) {
      return;
    }
    const timer = window.setTimeout(() => {
      toast.loading(m.comments_locating(), { id: LOCATE_TOAST });
    }, LOCATE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [commentId, threadQuery.isError, threadQuery.isSuccess]);

  useEffect(() => {
    if (threadQuery.isSuccess) {
      toast.dismiss(LOCATE_TOAST);
    }
  }, [threadQuery.isSuccess]);

  useEffect(() => {
    if (!threadQuery.isError) return;
    toast.dismiss(LOCATE_TOAST);
    toast.error(m.comments_locate_failed());
  }, [threadQuery.isError]);

  const requireTurnstile = () => {
    if (!turnstilePending) return false;
    toast.error(m.comments_turnstile_required());
    turnstileRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    throw new Error("TURNSTILE_PENDING");
  };

  const {
    root: rootComposer,
    reply: replyComposer,
    startRoot,
    startReply,
  } = useCommentComposer({
    target,
    userId: session?.user.id,
    isCreating,
    createComment,
    challenge: { requireReady: requireTurnstile, reset: resetTurnstile },
    onCreated: setLocalReveal,
  });
  const replyTarget = replyComposer.target;

  const handleDelete = async () => {
    if (commentToDelete) {
      await deleteComment({ id: commentToDelete });
      setCommentToDelete(null);
    }
  };

  const handleConfirmMute = async () => {
    if (!pendingMute) return;
    if (pendingMute.kind === "mute") {
      await muteUser({ userId: pendingMute.userId });
    } else {
      await unmuteUser({ userId: pendingMute.userId });
    }
    setPendingMute(null);
  };

  const viewerMuted = locallyMuted || (data?.pages[0]?.viewerMuted ?? false);
  const canCompose = !!session && !viewerMuted;
  const canReply = !viewerMuted;

  const challenge = (
    <div ref={turnstileRef}>
      <Turnstile
        {...turnstileProps}
        size={compactChallenge ? "compact" : "normal"}
      />
    </div>
  );
  const replyEditor = replyTarget ? (
    canCompose ? (
      <div className="comment-reply-composer">
        <CommentAvatar name={session?.user.name} image={session?.user.image} />
        <CommentEditor
          key={replyTarget.commentId}
          value={replyComposer.value}
          onChange={replyComposer.onChange}
          onSubmit={replyComposer.onSubmit}
          isSubmitting={isCreating}
          challengePending={turnstilePending}
          autoFocus
          onCancel={replyComposer.onCancel}
          submitLabel={m.comments_editor_submit_reply()}
          label={m.comments_item_reply_to({ name: replyTarget.userName })}
          challenge={challenge}
        />
      </div>
    ) : (
      <div className="comments-login">
        <p>
          {m.comments_list_login_to_reply({ userName: replyTarget.userName })}
        </p>
        <Link
          to="/login"
          search={{ redirectTo: loginReturn(replyTarget.commentId) }}
          className={buttonClass({ size: "lg" })}
        >
          {m.comments_login()}
        </Link>
        <Button variant="plain" size="sm" onClick={replyComposer.onCancel}>
          {m.comments_editor_cancel()}
        </Button>
      </div>
    )
  ) : null;

  if (isLoading) return <CommentSectionSkeleton />;
  if (!data)
    return (
      <section id="comments" className="comments-section">
        <h2>{m.comments_heading()}</h2>
        <Callout
          className="comment-load-error"
          tone="danger"
          icon={CircleAlert}
          role="alert"
          action={
            <Button
              variant="text"
              size="sm"
              onClick={() => void listQuery.refetch()}
              disabled={listQuery.isFetching}
            >
              {m.comments_retry()}
            </Button>
          }
        >
          {m.comments_load_failed()}
        </Callout>
      </section>
    );

  return (
    <section id="comments" className="comments-section">
      <h2>
        {m.comments_heading()} <span>{totalCount}</span>
      </h2>
      {session && viewerMuted ? (
        <p className="comments-muted">{m.comments_muted_message()}</p>
      ) : session ? (
        <>
          {(!rootComposer.isOpen || replyTarget) && (
            <button
              type="button"
              className="comment-new-trigger"
              disabled={isCreating}
              onClick={startRoot}
            >
              <CommentAvatar
                name={session.user.name}
                image={session.user.image}
              />
              <span>
                {rootComposer.value.trim()
                  ? m.comments_continue_draft()
                  : m.comments_start_new()}
              </span>
            </button>
          )}
          <CommentReveal open={rootComposer.isOpen && !replyTarget}>
            <div className="comment-new-composer">
              <CommentAvatar
                name={session.user.name}
                image={session.user.image}
              />
              <CommentEditor
                value={rootComposer.value}
                onChange={rootComposer.onChange}
                onSubmit={rootComposer.onSubmit}
                isSubmitting={isCreating}
                challengePending={turnstilePending}
                challenge={challenge}
                autoFocus
                onCancel={rootComposer.onCancel}
              />
            </div>
          </CommentReveal>
        </>
      ) : (
        <div className="comments-login">
          <p>{m.comments_join_discussion()}</p>
          <Link
            to="/login"
            search={{ redirectTo: loginReturn() }}
            className={buttonClass({ size: "lg" })}
          >
            <LogIn size={16} />
            {m.comments_login()}
          </Link>
        </div>
      )}
      <CommentList
        rootComments={rootComments}
        target={target}
        onReply={(rootIdArg, commentIdArg, userName) => {
          startReply({
            rootId: rootIdArg,
            commentId: commentIdArg,
            userName,
          });
        }}
        onDelete={(id) => setCommentToDelete(id)}
        onMute={(userId, userName) =>
          setPendingMute({ kind: "mute", userId, userName })
        }
        onUnmute={(userId, userName) =>
          setPendingMute({ kind: "unmute", userId, userName })
        }
        canReply={canReply}
        replyTarget={viewerMuted ? null : replyTarget}
        replyEditor={replyEditor}
        revealRootId={reveal?.rootId}
        revealCommentId={reveal?.commentId}
      />
      {listQuery.isError && (
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
                void (listQuery.isFetchNextPageError
                  ? fetchNextPage()
                  : listQuery.refetch())
              }
              disabled={listQuery.isFetching}
            >
              {m.comments_retry()}
            </Button>
          }
        >
          {m.comments_load_failed()}
        </Callout>
      )}
      {hasNextPage && !listQuery.isError && (
        <div className="comments-pagination">
          <Button
            size="lg"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? m.comments_loading() : m.comments_load_more()}
          </Button>
        </div>
      )}

      <CommentConfirmationModal
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDelete}
        title={m.comments_delete_title()}
        message={m.comments_delete_desc()}
        confirmLabel={m.comments_delete_confirm()}
        isDanger={true}
        isLoading={isDeleting}
      />

      <CommentConfirmationModal
        isOpen={!!pendingMute}
        onClose={() => setPendingMute(null)}
        onConfirm={handleConfirmMute}
        title={
          pendingMute?.kind === "unmute"
            ? m.comments_unmute_title()
            : m.comments_mute_title()
        }
        message={
          pendingMute?.kind === "unmute"
            ? m.comments_unmute_desc({ name: pendingMute.userName })
            : m.comments_mute_desc({
                name: pendingMute?.userName ?? "",
              })
        }
        confirmLabel={
          pendingMute?.kind === "unmute"
            ? m.comments_unmute_confirm()
            : m.comments_mute_confirm()
        }
        isLoading={isMuting || isUnmuting}
      />
    </section>
  );
}

function CommentSectionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-32 w-full rounded-(--fuwari-radius-large)" />
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="py-6 flex gap-4 border-b border-black/5 dark:border-white/5"
          >
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-3/4 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
