// PROTOTYPE (throwaway): the Admin redesign, round 3. Never merge.
//
// The Posts list on the canvas: status tabs with a sliding pill, search and
// filter chips, and two-line rows in one card. The data, the filters and the
// actions are the current page's; only what is drawn is new.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUpRight,
  EyeOff,
  FileText,
  Pin,
  PinOff,
  Plus,
  SearchX,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAdminPrimaryAction } from "@/components/admin/admin-chrome";
import {
  ChipMenu,
  EmptyBlock,
  Pager,
  SearchBox,
  SegTabs,
} from "@/components/admin/studio/studio-kit";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { categoryOptionsQuery } from "@/features/categories/queries";
import { openPublicPost } from "@/features/posts/utils/open-public-post";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { formatDate, formatTimeAgo } from "@/lib/utils";
import {
  useAppliedPostSort,
  useDeletePost,
  usePosts,
  useTogglePostPin,
  useUnpublishPost,
} from "../hooks";
import { useListScroll } from "../hooks/use-list-scroll";
import type {
  AdminPostListItem,
  CategoryFilter,
  PostPopularity,
  SortField,
  StatusFilter,
} from "../types";
import { POSTS_PER_PAGE, SORT_FIELDS } from "../types";
import "./studio-posts.css";

interface StudioPostsProps {
  page: number;
  status: StatusFilter;
  sortBy: SortField;
  search: string;
  category?: CategoryFilter;
  tag?: number;
  onPageChange: (page: number) => void;
  onStatusChange: (status: StatusFilter) => void;
  onSortByChange: (sortBy: SortField, replace?: boolean) => void;
  onSearchChange: (search: string) => void;
  onCategoryChange: (category?: CategoryFilter, replace?: boolean) => void;
  onTagChange: (tag?: number, replace?: boolean) => void;
  onResetFilters: () => void;
}

const SORT_LABELS: Record<SortField, string> = {
  updatedAt: "最近修改",
  publishedAt: "最近发布",
  viewCount: "浏览最多",
  commentCount: "评论最多",
};

const order = (i: number) => ({ "--i": i }) as object;

export function StudioPosts({
  page,
  status,
  sortBy,
  search,
  category,
  tag,
  onPageChange,
  onStatusChange,
  onSortByChange,
  onSearchChange,
  onCategoryChange,
  onTagChange,
  onResetFilters,
}: StudioPostsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<AdminPostListItem | null>(null);
  const [toUnpublish, setToUnpublish] = useState<AdminPostListItem | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The field answers at once; the address follows 300 ms after the last key.
  const [searchInput, setSearchInput] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submit = useRef(onSearchChange);
  submit.current = onSearchChange;
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
      submit.current(value);
    }, 300);
  };
  const resetFilters = () => {
    clearTimer();
    setSearchInput("");
    onResetFilters();
  };

  const {
    posts,
    totalCount,
    totalPages,
    statusCounts,
    popularity,
    isPending,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = usePosts({ page, status, sortBy, search, category, tag });
  const shownSort = useAppliedPostSort(sortBy, popularity, onSortByChange);
  const viewsSortable = popularity === undefined || popularity === "ready";
  useListScroll(
    scrollRef,
    { page, status, sortBy, search, category, tag },
    !isPending && !isPlaceholderData && !error,
  );
  useEffect(() => {
    if (
      !isPending &&
      !isPlaceholderData &&
      !error &&
      page > Math.max(1, totalPages)
    )
      onPageChange(Math.max(1, totalPages));
  }, [page, totalPages, isPending, isPlaceholderData, error, onPageChange]);

  const categories = useQuery({ ...categoryOptionsQuery }).data ?? [];
  const tags = useQuery({ ...tagsAdminQueryOptions() }).data ?? [];

  const create = useMutation({
    mutationFn: () => orpcClient.posts.admin.create(),
    onSuccess: (post) => {
      void queryClient.invalidateQueries({
        queryKey: orpc.posts.admin.list.key(),
      });
      void navigate({
        to: "/admin/posts/edit/$id",
        params: { id: String(post.id) },
      });
    },
    onError: () => toast.error("新建文章失败"),
  });
  const createLabel = create.isPending ? "正在新建…" : "新建文章";
  // The phone's top bar shows the same action.
  useAdminPrimaryAction({
    label: createLabel,
    icon: <Plus size={17} />,
    onClick: () => create.mutate(),
    loading: create.isPending,
  });
  const remove = useDeletePost({ onSuccess: () => setToDelete(null) });
  const unpublish = useUnpublishPost({ onSuccess: () => setToUnpublish(null) });
  const pin = useTogglePostPin();

  const filtered =
    status !== "ALL" ||
    Boolean(search.trim()) ||
    category !== undefined ||
    tag !== undefined;
  const total = statusCounts
    ? statusCounts.draft + statusCounts.published
    : undefined;
  const first = (page - 1) * POSTS_PER_PAGE + 1;
  const returnFocus = () =>
    triggerRef.current?.isConnected ? triggerRef.current : searchRef.current;

  return (
    <div className="sx-page">
      <header className="sx-head sx-rise" style={order(0)}>
        <h1 className="sx-title">
          文章
          {total === undefined ? null : <small>{total}</small>}
        </h1>
        <button
          type="button"
          className="sx-primary"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus size={16} />
          {createLabel}
        </button>
      </header>

      <div className="sx-bar sx-rise" style={order(1)}>
        <SegTabs
          label="按状态筛选"
          value={status}
          onChange={onStatusChange}
          items={[
            { value: "ALL", label: "全部", count: total },
            {
              value: "PUBLISHED",
              label: "已发布",
              count: statusCounts?.published,
            },
            {
              value: "CHANGED",
              label: "有修改",
              count: statusCounts?.unpublishedChanges,
            },
            { value: "DRAFT", label: "草稿", count: statusCounts?.draft },
          ]}
        />
        <div className="sx-bar-end">
          <SearchBox
            value={searchInput}
            onChange={typeSearch}
            placeholder="搜索文章"
            inputRef={searchRef}
          />
          <ChipMenu
            label="分类"
            neutral=""
            value={category === undefined ? "" : String(category)}
            onChange={(value) =>
              onCategoryChange(
                value === "" ? undefined : value === "none" ? "none" : +value,
              )
            }
            options={[
              { value: "", label: "全部分类" },
              { value: "none", label: "未分类" },
              ...categories.map((item) => ({
                value: String(item.id),
                label: item.name,
              })),
            ]}
          />
          <ChipMenu
            label="标签"
            neutral=""
            value={tag === undefined ? "" : String(tag)}
            onChange={(value) => onTagChange(value === "" ? undefined : +value)}
            options={[
              { value: "", label: "全部标签" },
              ...tags.map((item) => ({
                value: String(item.id),
                label: item.name,
              })),
            ]}
          />
          <ChipMenu
            label="排序"
            value={shownSort}
            onChange={onSortByChange}
            options={SORT_FIELDS.filter(
              (field) => field !== "viewCount" || viewsSortable,
            ).map((field) => ({ value: field, label: SORT_LABELS[field] }))}
          />
        </div>
      </div>

      <section
        className="sx-card sx-rise"
        style={order(2)}
        data-loading={isFetching && !isPending ? "" : undefined}
      >
        <div className="sx-cols sp-cols" role="row">
          <span>文章</span>
          <span>状态</span>
          <span className="sp-num">
            {viewsSortable ? (
              <SortHead
                field="viewCount"
                sortBy={shownSort}
                onSort={onSortByChange}
              >
                浏览
              </SortHead>
            ) : (
              "浏览"
            )}
          </span>
          <span className="sp-num">
            <SortHead
              field="commentCount"
              sortBy={shownSort}
              onSort={onSortByChange}
            >
              评论
            </SortHead>
          </span>
          <span>
            <SortHead
              field={shownSort === "publishedAt" ? "publishedAt" : "updatedAt"}
              sortBy={shownSort}
              onSort={onSortByChange}
            >
              {shownSort === "publishedAt" ? "发布时间" : "最近修改"}
            </SortHead>
          </span>
          <span />
        </div>

        {error ? (
          <EmptyBlock
            icon={<TriangleAlert size={20} />}
            title="没能读取文章"
            action={
              <button
                type="button"
                className="sx-text-btn"
                onClick={() => void refetch()}
              >
                重试
              </button>
            }
          />
        ) : isPending ? (
          <div className="sx-rows" aria-busy>
            {Array.from({ length: 9 }, (_, index) => (
              <div key={index} className="sp-skel">
                <div>
                  <span
                    className="sx-skel"
                    style={{ width: `${38 + ((index * 17) % 34)}%` }}
                  />
                  <span
                    className="sx-skel"
                    style={{
                      width: `${18 + ((index * 11) % 16)}%`,
                      height: 10,
                    }}
                  />
                </div>
                <div>
                  <span
                    className="sx-skel"
                    style={{ display: "block", width: 52 }}
                  />
                </div>
                <div />
                <div />
                <div>
                  <span
                    className="sx-skel"
                    style={{ display: "block", width: 48 }}
                  />
                </div>
                <div />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          filtered ? (
            <EmptyBlock
              icon={<SearchX size={20} />}
              title="没有符合条件的文章"
              text="换一个关键词，或者清除筛选条件。"
              action={
                <button
                  type="button"
                  className="sx-text-btn"
                  onClick={resetFilters}
                >
                  清除筛选
                </button>
              }
            />
          ) : (
            <EmptyBlock
              icon={<FileText size={20} />}
              title="还没有文章"
              text="第一篇文章从这里开始。"
              action={
                <button
                  type="button"
                  className="sx-text-btn"
                  onClick={() => create.mutate()}
                >
                  新建文章
                </button>
              }
            />
          )
        ) : (
          <div
            ref={scrollRef}
            className="sx-rows"
            role="rowgroup"
            aria-busy={isPlaceholderData}
            data-scroll-restoration-id="admin-post-list"
          >
            {posts.map((post, index) => (
              <Row
                key={post.id}
                index={index}
                post={post}
                sortBy={shownSort}
                popularity={popularity}
                pinPending={pin.isPending && pin.variables.id === post.id}
                onTogglePin={() => pin.mutate(post)}
                onDelete={(trigger) => {
                  triggerRef.current = trigger;
                  setToDelete(post);
                }}
                onUnpublish={(trigger) => {
                  triggerRef.current = trigger;
                  setToUnpublish(post);
                }}
              />
            ))}
          </div>
        )}

        {!isPending && !error && posts.length > 0 ? (
          <footer className="sx-foot">
            <span>
              {totalPages > 1
                ? `第 ${first}–${first + posts.length - 1} 篇，共 ${totalCount} 篇`
                : `共 ${totalCount} 篇`}
            </span>
            <Pager
              page={page}
              totalPages={totalPages}
              onChange={onPageChange}
            />
          </footer>
        ) : null}
      </section>

      <ConfirmationModal
        isOpen={!!toDelete}
        title="删除这篇文章？"
        message={`「${toDelete?.title.trim() || "无标题"}」会被永久删除，无法恢复。`}
        confirmLabel="删除"
        isDanger
        isLoading={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete);
        }}
        returnFocus={returnFocus}
      />
      <ConfirmationModal
        isOpen={!!toUnpublish}
        title="取消发布？"
        message="文章会从站点上撤下，回到草稿状态。"
        confirmLabel="取消发布"
        isDanger
        isLoading={unpublish.isPending}
        onClose={() => setToUnpublish(null)}
        onConfirm={() => {
          if (toUnpublish) unpublish.mutate(toUnpublish.id);
        }}
        returnFocus={returnFocus}
      />
    </div>
  );
}

function SortHead({
  field,
  sortBy,
  onSort,
  children,
}: {
  field: SortField;
  sortBy: SortField;
  onSort: (sortBy: SortField) => void;
  children: string;
}) {
  const active = sortBy === field;
  return (
    <button
      type="button"
      className="sx-sort"
      aria-pressed={active}
      aria-label={`按${children}排序`}
      onClick={() => onSort(field)}
    >
      {children}
      {active ? <ArrowDown size={12} aria-hidden /> : null}
    </button>
  );
}

function noViewsHint(post: AdminPostListItem, popularity?: PostPopularity) {
  if (post.status !== "published" || !post.publicSlug)
    return "发布后才有浏览数据";
  if (popularity === "unconfigured") return "尚未接入访问统计";
  if (popularity === "expired") return "热度数据已过期";
  return "暂时没有浏览数据";
}

function Row({
  post,
  index,
  sortBy,
  popularity,
  pinPending,
  onTogglePin,
  onDelete,
  onUnpublish,
}: {
  post: AdminPostListItem;
  index: number;
  sortBy: SortField;
  popularity?: PostPopularity;
  pinPending: boolean;
  onTogglePin: () => void;
  onDelete: (trigger: HTMLButtonElement) => void;
  onUnpublish: (trigger: HTMLButtonElement) => void;
}) {
  const title = post.title.trim();
  const published = post.status === "published";
  const state = !published
    ? "draft"
    : post.hasUnpublishedChanges
      ? "changed"
      : "published";
  const stateLabel =
    state === "draft"
      ? "草稿"
      : state === "changed"
        ? "有修改未发布"
        : "已发布";
  const date = sortBy === "publishedAt" ? post.publishedAt : post.updatedAt;
  const { publicSlug } = post;
  const shownTags = post.tags.slice(0, 3);

  const actions: Array<ActionMenuItem> = [];
  if (published && publicSlug)
    actions.push({
      label: "查看已发布页面",
      icon: ArrowUpRight,
      onSelect: () => openPublicPost(publicSlug),
    });
  actions.push({
    label: post.pinnedAt ? "取消置顶" : "置顶",
    icon: post.pinnedAt ? PinOff : Pin,
    disabled: pinPending,
    onSelect: onTogglePin,
  });
  if (published)
    actions.push({
      label: "取消发布",
      icon: EyeOff,
      danger: true,
      separator: true,
      onSelect: onUnpublish,
    });
  actions.push({
    label: "删除文章",
    icon: Trash2,
    danger: true,
    separator: !published,
    onSelect: onDelete,
  });

  const stateBadge = (
    <span className="sp-state" data-state={state}>
      <i />
      {stateLabel}
    </span>
  );
  const time = date ? (
    <time
      dateTime={date.toISOString()}
      title={formatDate(date, { includeTime: true })}
    >
      {formatTimeAgo(date)}
    </time>
  ) : (
    "—"
  );

  return (
    <div className="sp-row sx-row-in" role="row" style={order(index)}>
      <div className="sp-main" role="cell">
        <p className="sp-title">
          <Link
            to="/admin/posts/edit/$id"
            params={{ id: String(post.id) }}
            data-untitled={title ? undefined : ""}
          >
            {title || "无标题"}
          </Link>
          {post.pinnedAt ? (
            <Pin size={13} className="sp-pin" role="img" aria-label="已置顶" />
          ) : null}
        </p>
        <p className="sp-sub">
          <span className="sp-sub-only">
            {stateBadge}
            <i />
            <span>{time}</span>
            <i />
          </span>
          {post.category ? <b>{post.category.name}</b> : <span>未分类</span>}
          {shownTags.map((item) => (
            <span key={item.id}>#{item.name}</span>
          ))}
          {post.tags.length > shownTags.length ? (
            <span>+{post.tags.length - shownTags.length}</span>
          ) : null}
        </p>
      </div>
      {stateBadge}
      <span
        className="sp-num sp-count"
        role="cell"
        data-zero={post.viewCount ? undefined : ""}
        data-sorted={sortBy === "viewCount" ? "" : undefined}
        title={
          post.viewCount === undefined
            ? noViewsHint(post, popularity)
            : undefined
        }
      >
        {post.viewCount === undefined ? "—" : post.viewCount.toLocaleString()}
      </span>
      <span
        className="sp-num sp-count"
        role="cell"
        data-zero={post.commentCount ? undefined : ""}
        data-sorted={sortBy === "commentCount" ? "" : undefined}
      >
        {post.commentCount.toLocaleString()}
      </span>
      <span className="sp-time" role="cell">
        {time}
      </span>
      <div className="sp-acts" role="cell">
        {published && publicSlug ? (
          <button
            type="button"
            className="sp-act"
            title="查看已发布页面"
            aria-label={`查看已发布页面：${title || "无标题"}`}
            onClick={() => openPublicPost(publicSlug)}
          >
            <ArrowUpRight size={16} />
          </button>
        ) : null}
        <ActionMenu
          label={`更多操作：${title || "无标题"}`}
          items={actions}
          triggerClassName="sp-act sp-more"
          placement="bottom-end"
        />
      </div>
    </div>
  );
}
