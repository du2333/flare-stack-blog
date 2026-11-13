import { Link } from "@tanstack/react-router";
import { ArrowUpRight, EyeOff, Pin, PinOff, Trash2 } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { IconButton, iconButtonClass } from "@/components/ui/icon-button";
import { ListCardColumns, SortHeader } from "@/components/ui/list-card";
import { openPublicPost } from "@/features/posts/utils/open-public-post";
import {
  postStateOf,
  postStateLabel,
} from "@/features/posts/components/post-state";
import { formatCount, formatDate, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { AdminPostListItem, PostPopularity, SortField } from "../types";

/** The Tags a row names after its Category; the rest are counted. */
const TAGS_SHOWN = 3;

const order = (i: number) => ({ "--i": i }) as object;

/** Why a Post has no view count, in words. */
function noViewsHint(post: AdminPostListItem, popularity?: PostPopularity) {
  if (post.status !== "published" || !post.publicSlug)
    return m.admin_posts_views_draft();
  switch (popularity) {
    case "unconfigured":
      return m.admin_posts_views_unconfigured();
    case "expired":
      return m.admin_posts_views_expired();
    default:
      return m.admin_posts_views_missing();
  }
}

function Sort({
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
  return (
    <SortHeader
      active={sortBy === field}
      label={m.admin_posts_sort_by_column({ column: children })}
      onSort={() => onSort(field)}
    >
      {children}
    </SortHeader>
  );
}

/**
 * The names of the columns, in the grid the rows share. The sortable ones
 * are buttons: 浏览 only while views can be read, the time by what the list
 * shows (最近修改 or 发布时间).
 */
export function PostListColumns({
  sortBy,
  viewsSortable,
  onSortByChange,
}: {
  sortBy: SortField;
  viewsSortable: boolean;
  onSortByChange: (sortBy: SortField) => void;
}) {
  const published = sortBy === "publishedAt";
  return (
    <ListCardColumns className="post-cols">
      <span role="columnheader">{m.admin_posts_col_title()}</span>
      <span role="columnheader">{m.admin_posts_col_status()}</span>
      <span role="columnheader" className="post-num">
        {viewsSortable ? (
          <Sort field="viewCount" sortBy={sortBy} onSort={onSortByChange}>
            {m.admin_posts_col_views()}
          </Sort>
        ) : (
          m.admin_posts_col_views()
        )}
      </span>
      <span role="columnheader" className="post-num">
        <Sort field="commentCount" sortBy={sortBy} onSort={onSortByChange}>
          {m.admin_posts_col_comments()}
        </Sort>
      </span>
      <span role="columnheader">
        <Sort
          field={published ? "publishedAt" : "updatedAt"}
          sortBy={sortBy}
          onSort={onSortByChange}
        >
          {published
            ? m.admin_posts_col_published_at()
            : m.admin_posts_sort_recent_upd()}
        </Sort>
      </span>
      <span role="columnheader" aria-label={m.admin_posts_col_actions()} />
    </ListCardColumns>
  );
}

/**
 * One Post in two lines: the title (the row's link, to the editor) over its
 * Category and Tags; then its state, views, Comments and time. The actions
 * show under the pointer or focus; narrower than a table, state and time
 * join the second line.
 */
export function PostRow({
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
  /** The row's place, for the rise-in. */
  index: number;
  sortBy: SortField;
  /** Why views may be missing; with `ready`, a published Post always has them. */
  popularity?: PostPopularity;
  pinPending: boolean;
  onTogglePin: () => void;
  onDelete: (trigger: HTMLButtonElement) => void;
  onUnpublish: (trigger: HTMLButtonElement) => void;
}) {
  const title = post.title.trim() || m.common_untitled();
  const untitled = !post.title.trim();
  const published = post.status === "published";
  const state = postStateOf({
    published,
    hasUnpublishedChanges: post.hasUnpublishedChanges,
  });
  const stateLabel = postStateLabel(state);
  const date = sortBy === "publishedAt" ? post.publishedAt : post.updatedAt;
  const { publicSlug } = post;
  const shownTags = post.tags.slice(0, TAGS_SHOWN);

  const actions: Array<ActionMenuItem> = [];
  if (published && publicSlug)
    actions.push({
      label: m.admin_posts_view_published(),
      icon: ArrowUpRight,
      onSelect: () => openPublicPost(publicSlug),
    });
  actions.push({
    label: post.pinnedAt
      ? m.admin_posts_action_unpin()
      : m.admin_posts_action_pin(),
    icon: post.pinnedAt ? PinOff : Pin,
    disabled: pinPending,
    onSelect: onTogglePin,
  });
  if (published)
    actions.push({
      label: m.editor_header_unpublish(),
      icon: EyeOff,
      danger: true,
      separator: true,
      onSelect: onUnpublish,
    });
  actions.push({
    label: m.admin_posts_action_delete_post(),
    icon: Trash2,
    danger: true,
    separator: !published,
    onSelect: onDelete,
  });

  const stateBadge = (
    <span className="post-state" data-state={state}>
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
    <div
      className="post-row fuwari-list-card-row-in"
      role="row"
      style={order(index)}
    >
      <div className="post-main" role="cell">
        <p className="post-title">
          <Link
            to="/admin/posts/edit/$id"
            params={{ id: String(post.id) }}
            data-untitled={untitled ? "" : undefined}
          >
            {title}
          </Link>
          {post.pinnedAt ? (
            <Pin
              size={13}
              className="post-pin"
              role="img"
              aria-label={m.admin_posts_pinned()}
            />
          ) : null}
        </p>
        <p className="post-sub">
          <span className="post-sub-only">
            {stateBadge}
            <i />
            <span>{time}</span>
            <i />
          </span>
          {post.category ? (
            <b>{post.category.name}</b>
          ) : (
            <span>{m.post_uncategorized()}</span>
          )}
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
        className="post-num post-count"
        role="cell"
        data-zero={post.viewCount ? undefined : ""}
        data-sorted={sortBy === "viewCount" ? "" : undefined}
        title={
          post.viewCount === undefined
            ? noViewsHint(post, popularity)
            : undefined
        }
      >
        {post.viewCount === undefined ? "—" : formatCount(post.viewCount)}
      </span>
      <span
        className="post-num post-count"
        role="cell"
        data-zero={post.commentCount ? undefined : ""}
        data-sorted={sortBy === "commentCount" ? "" : undefined}
      >
        {formatCount(post.commentCount)}
      </span>
      <span className="post-time" role="cell">
        {time}
      </span>
      <div className="post-acts" role="cell">
        {published && publicSlug ? (
          <IconButton
            variant="quiet"
            className="post-act"
            label={m.admin_posts_view_published_named({ title })}
            onClick={() => openPublicPost(publicSlug)}
          >
            <ArrowUpRight size={16} />
          </IconButton>
        ) : null}
        <ActionMenu
          label={m.admin_posts_more_named({ title })}
          items={actions}
          triggerClassName={iconButtonClass({
            variant: "quiet",
            className: "post-act post-more",
          })}
          placement="bottom-end"
        />
      </div>
    </div>
  );
}
