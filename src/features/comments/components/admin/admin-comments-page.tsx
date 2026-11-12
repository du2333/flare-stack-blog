import { ORPCError } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { pendingCommentsCountQuery } from "@/components/admin/admin-counts";
import { AdminPage, AdminPageToolbar } from "@/components/admin/admin-page";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import {
  ADMIN_COMMENTS_PAGE_SIZE,
  type AdminCommentView,
} from "@/features/comments/comments.schema";
import { useAdminCommentActions } from "@/features/comments/hooks/use-admin-comment-actions";
import {
  adminCommentsQuery,
  commentedPostsQuery,
  type AdminCommentsParams,
} from "@/features/comments/queries/admin";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { AdminCommentList } from "./admin-comment-list";
import "./admin-comments.css";

/** Every Comment, at the smallest page, for the 全部 tab's count. */
const allCommentsCountQuery = orpc.comments.admin.list.queryOptions({
  input: { view: "all", limit: 1 },
});

export type AdminCommentsSearch = Omit<AdminCommentsParams, "postId"> & {
  post?: number;
};

/**
 * The Admin's Comments page: the Comments awaiting a reply (the sidebar's and
 * the overview's count) and every Comment, newest first. The view, search,
 * Post and page live in the address (`search`), changed through `onChange`.
 */
export function AdminCommentsPage({
  search: params,
  onChange,
}: {
  search: AdminCommentsSearch;
  /** `replace` corrects the address without a history entry. */
  onChange: (updates: Partial<AdminCommentsSearch>, replace?: boolean) => void;
}) {
  const { view, page, search, post } = params;
  const headingRef = useRef<HTMLDivElement>(null);
  const markAllTrigger = useRef<HTMLButtonElement>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const { markAllHandled, isMarkingAll } = useAdminCommentActions();
  const unreplied = useQuery({
    ...pendingCommentsCountQuery,
    select: (data) => data.total,
  });
  const everything = useQuery({
    ...allCommentsCountQuery,
    select: (data) => data.total,
  });
  const query = useQuery(
    adminCommentsQuery({ view, page, search, postId: post }),
  );
  const posts = useQuery({ ...commentedPostsQuery, enabled: view === "all" });

  // Search as the Admin types, a moment after they stop.
  const [searchInput, setSearchInput] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => {
    clearTimer();
    setSearchInput(search);
  }, [search, clearTimer]);
  useEffect(() => clearTimer, [clearTimer]);
  const typeSearch = (value: string) => {
    setSearchInput(value);
    clearTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      onChangeRef.current({ search: value, page: 1 }, true);
    }, 300);
  };

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_COMMENTS_PAGE_SIZE));
  const settled = query.isSuccess && !query.isPlaceholderData;
  useEffect(() => {
    if (settled && page > totalPages) onChange({ page: totalPages }, true);
  }, [settled, page, totalPages, onChange]);
  // A Post filter left in the address after the Post was deleted.
  const missingPost =
    query.error instanceof ORPCError && query.error.code === "POST_NOT_FOUND";
  useEffect(() => {
    if (missingPost) onChange({ post: undefined, page: 1 }, true);
  }, [missingPost, onChange]);

  const filtered = view === "all" && (Boolean(search.trim()) || post != null);
  const clearFilters = () => {
    clearTimer();
    setSearchInput("");
    onChange({ search: "", post: undefined, page: 1 });
  };
  const unrepliedCount = unreplied.data;

  const tabs = (
    <Tabs<AdminCommentView>
      aria-label={m.admin_comments_views()}
      value={view}
      onValueChange={(next) =>
        onChange({ view: next, page: 1, search: "", post: undefined })
      }
      items={[
        {
          value: "unreplied",
          label: m.admin_comments_view_unreplied(),
          count: unrepliedCount ?? "—",
        },
        {
          value: "all",
          label: m.admin_comments_view_all(),
          count: everything.data ?? "—",
        },
      ]}
    />
  );
  const postOptions = [
    { value: "", label: m.admin_comments_filter_all_posts() },
    ...(posts.data ?? []).map((item) => ({
      value: String(item.id),
      label: `${item.title.trim() || m.common_untitled()} (${item.comments})`,
    })),
  ];
  // A Post whose Comments have all gone is still the filter's value.
  if (post != null && !postOptions.some((o) => o.value === String(post)))
    postOptions.push({
      value: String(post),
      label: query.data?.items[0]?.pageTitle ?? m.admin_comments_filter_post(),
    });
  const tools =
    view === "all" ? (
      <>
        <SearchField
          className="admin-comments-search"
          value={searchInput}
          onValueChange={typeSearch}
          placeholder={m.admin_comments_search()}
          aria-label={m.admin_comments_search()}
          maxLength={200}
          clearLabel={m.admin_comments_search_clear()}
        />
        <Select
          className="admin-comments-post"
          aria-label={m.admin_comments_filter_post()}
          value={post == null ? "" : String(post)}
          options={postOptions}
          onChange={(value) =>
            onChange({ post: value ? Number(value) : undefined, page: 1 })
          }
        />
      </>
    ) : unrepliedCount !== 0 ? (
      // Present while the count loads, so the row under the tabs does not
      // appear (and push the list down) once it is known.
      <Button
        ref={markAllTrigger}
        icon={<CheckCheck size={16} />}
        disabled={unrepliedCount === undefined}
        onClick={() => setConfirmAll(true)}
      >
        {m.admin_comments_handle_all()}
      </Button>
    ) : null;

  const comments = query.data?.items ?? [];
  let body;
  if (query.isPending || missingPost) {
    body = <AdminCommentsSkeleton />;
  } else if (query.isError) {
    body = (
      <EmptyState
        role="alert"
        description={m.admin_comments_load_error()}
        action={
          <Button variant="text" onClick={() => void query.refetch()}>
            {m.error_retry()}
          </Button>
        }
      />
    );
  } else if (comments.length === 0) {
    body = filtered ? (
      <EmptyState
        description={m.admin_comments_no_results()}
        action={
          <Button variant="text" onClick={clearFilters}>
            {m.admin_comments_clear_filters()}
          </Button>
        }
      />
    ) : view === "unreplied" ? (
      <EmptyState
        description={m.admin_comments_empty_unreplied()}
        action={
          <Button variant="text" onClick={() => onChange({ view: "all" })}>
            {m.admin_comments_show_all()}
          </Button>
        }
      />
    ) : (
      <EmptyState description={m.admin_comments_empty()} />
    );
  } else {
    body = (
      <>
        <AdminCommentList
          comments={comments}
          fallbackFocus={() => headingRef.current}
        />
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={ADMIN_COMMENTS_PAGE_SIZE}
          currentPageItemCount={comments.length}
          onPageChange={(next) => onChange({ page: next })}
        />
      </>
    );
  }

  return (
    <AdminPage
      className="admin-comments"
      title={m.admin_comments_title()}
      count={unrepliedCount ?? "—"}
      toolbar={
        <AdminPageToolbar
          className="admin-comments-toolbar"
          tabs={tabs}
          tools={tools}
        />
      }
      body="list"
      bodyLabel={m.admin_comments_title()}
    >
      <div
        ref={headingRef}
        tabIndex={-1}
        className="admin-comments-body"
        aria-busy={query.isFetching}
      >
        {body}
      </div>
      <ConfirmationModal
        isOpen={confirmAll}
        title={m.admin_comments_handle_all_title()}
        message={m.admin_comments_handle_all_desc({
          count: unrepliedCount ?? 0,
        })}
        confirmLabel={m.admin_comments_handle_all()}
        isLoading={isMarkingAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={async () => {
          if (isMarkingAll) return;
          try {
            await markAllHandled();
          } catch {
            // The toast says it failed.
          } finally {
            setConfirmAll(false);
          }
        }}
        returnFocus={() =>
          markAllTrigger.current?.isConnected
            ? markAllTrigger.current
            : headingRef.current
        }
      />
    </AdminPage>
  );
}

/** Rows as tall as the real ones while the first page loads. */
export function AdminCommentsSkeleton() {
  return (
    <ul className="admin-comment-list" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="admin-comment">
          <div className="admin-comment-row">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="admin-comment-main">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="mt-2 h-4 w-full max-w-xl rounded" />
              <Skeleton className="mt-2 h-3 w-48 rounded" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
