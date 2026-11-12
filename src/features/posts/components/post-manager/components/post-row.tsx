import { ClientOnly, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ExternalLink,
  EyeOff,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { iconButtonClass } from "@/components/ui/icon-button";
import { postStateOf } from "@/features/posts/components/post-state";
import { PostStatusBadge } from "@/features/posts/components/post-status-badge";
import { openPublicPost } from "@/features/posts/utils/open-public-post";
import { formatDate, formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { AdminPostListItem, PostPopularity, SortField } from "../types";

/** The Tags a row names after its Category; the rest are counted. */
const TAGS_SHOWN = 2;

interface PostRowProps {
  post: AdminPostListItem;
  sortBy: SortField;
  /** Why views may be missing; with `ready`, a published Post always has them. */
  popularity?: PostPopularity;
  onDelete: (
    post: AdminPostListItem,
    trigger: HTMLButtonElement | null,
  ) => void;
  onTogglePin?: (post: AdminPostListItem) => void;
  pinPending?: boolean;
  onUnpublish?: (post: AdminPostListItem, trigger: HTMLButtonElement) => void;
}

/**
 * The Category, then up to two Tags, then how many more: the text of the
 * Category and Tags cell, and its full text for the tooltip.
 */
export function taxonomySummary(
  category: AdminPostListItem["category"],
  tags: AdminPostListItem["tags"],
) {
  const shown = tags.slice(0, TAGS_SHOWN);
  return {
    category: category?.name ?? null,
    tags: shown.map((tag) => tag.name),
    more: tags.length - shown.length,
    full: [category?.name, ...tags.map((tag) => `#${tag.name}`)]
      .filter(Boolean)
      .join("  "),
  };
}

function Count({ value }: { value: number | undefined }) {
  return value === undefined ? null : value.toLocaleString();
}

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

/**
 * The names of the columns, in the grid the rows share. The sortable ones are
 * buttons: 浏览 only while views can be read, 最近修改 or 最近发布 by what the
 * list shows.
 */
export function PostListHeader({
  sortBy,
  viewsSortable,
  onSortByChange,
}: {
  sortBy: SortField;
  viewsSortable: boolean;
  onSortByChange: (sortBy: SortField) => void;
}) {
  const sortButton = (field: SortField, label: string) => {
    const active = sortBy === field;
    return (
      <Button
        variant="plain"
        size="sm"
        className="post-list-sort"
        data-active={active ? "" : undefined}
        aria-label={m.admin_posts_sort_by_column({ column: label })}
        aria-pressed={active}
        onClick={() => onSortByChange(field)}
      >
        {label}
        {active ? <ArrowDown size={12} aria-hidden="true" /> : null}
      </Button>
    );
  };
  return (
    <div role="row" className="post-list-header">
      <div role="columnheader">{m.admin_posts_col_title()}</div>
      <div role="columnheader">{m.admin_posts_col_status()}</div>
      <div role="columnheader" className="post-list-col-taxonomy">
        {m.admin_posts_col_taxonomy()}
      </div>
      <div role="columnheader" className="post-list-col-number">
        {viewsSortable
          ? sortButton("viewCount", m.admin_posts_col_views())
          : m.admin_posts_col_views()}
      </div>
      <div role="columnheader" className="post-list-col-number">
        {sortButton("commentCount", m.admin_posts_col_comments())}
      </div>
      <div role="columnheader" className="post-list-col-time">
        {sortBy === "publishedAt"
          ? sortButton("publishedAt", m.admin_posts_sort_recent_pub())
          : sortButton("updatedAt", m.admin_posts_sort_recent_upd())}
      </div>
      <div role="columnheader" className="sr-only">
        {m.admin_posts_col_actions()}
      </div>
    </div>
  );
}

/**
 * One Post: a row of cells from 1024px, a title line and a line of details
 * below. The title is the link, stretched over the whole row, so the row opens
 * the editor and Tab reaches it once; the menu sits above that link.
 */
export function PostRow({
  post,
  sortBy,
  popularity,
  onDelete,
  onTogglePin,
  pinPending,
  onUnpublish,
}: PostRowProps) {
  const title = post.title.trim() || m.common_untitled();
  const date = sortBy === "publishedAt" ? post.publishedAt : post.updatedAt;
  const published = post.status === "published";
  const { publicSlug } = post;
  const actions: Array<ActionMenuItem> = [];
  if (published && publicSlug)
    actions.push({
      label: m.admin_posts_action_view_live(),
      icon: ExternalLink,
      onSelect: () => openPublicPost(publicSlug),
    });
  if (onTogglePin)
    actions.push({
      label: post.pinnedAt
        ? m.admin_posts_action_unpin()
        : m.admin_posts_action_pin(),
      icon: post.pinnedAt ? PinOff : Pin,
      disabled: pinPending,
      onSelect: () => onTogglePin(post),
    });
  if (published && onUnpublish)
    actions.push({
      label: m.editor_header_unpublish(),
      icon: EyeOff,
      danger: true,
      onSelect: (trigger) => onUnpublish(post, trigger),
    });
  actions.push({
    label: m.admin_posts_action_delete_post(),
    icon: Trash2,
    danger: true,
    separator: actions.length > 0,
    onSelect: (trigger) => onDelete(post, trigger),
  });
  const summary = taxonomySummary(post.category, post.tags);
  const hasTaxonomy = summary.category !== null || summary.tags.length > 0;
  const viewsHint =
    post.viewCount === undefined ? noViewsHint(post, popularity) : undefined;
  return (
    <div role="row" className="admin-list-row post-row">
      <div role="cell" className="post-row-title">
        {post.pinnedAt && (
          <Pin
            size={14}
            role="img"
            aria-label={m.admin_posts_pinned()}
            className="post-list-pin"
          />
        )}
        <Link
          to="/admin/posts/edit/$id"
          params={{ id: String(post.id) }}
          className="post-row-link"
        >
          {title}
        </Link>
      </div>
      <div role="cell" className="post-row-status">
        <PostStatusBadge
          quiet
          state={postStateOf({
            published,
            hasUnpublishedChanges: post.hasUnpublishedChanges,
          })}
        />
      </div>
      <div role="none" className="post-row-meta">
        <div
          role="cell"
          className="post-row-taxonomy"
          title={summary.full || undefined}
        >
          {hasTaxonomy ? (
            <>
              {summary.category && (
                <span className="post-row-category">{summary.category}</span>
              )}
              {summary.tags.map((name) => (
                <span key={name}>#{name}</span>
              ))}
              {summary.more > 0 && (
                <span className="post-row-more">+{summary.more}</span>
              )}
            </>
          ) : (
            <span className="post-row-none">—</span>
          )}
        </div>
        <div
          role="cell"
          className="post-row-number post-row-views"
          data-label={m.admin_posts_col_views()}
        >
          {viewsHint === undefined ? (
            <Count value={post.viewCount} />
          ) : (
            <span title={viewsHint}>
              —<span className="sr-only">{viewsHint}</span>
            </span>
          )}
        </div>
        <div
          role="cell"
          className="post-row-number post-row-comments"
          data-label={m.admin_posts_col_comments()}
        >
          <Count value={post.commentCount} />
        </div>
        <div role="cell" className="post-row-time">
          <ClientOnly fallback="—">
            {date ? (
              <time
                dateTime={date.toISOString()}
                title={formatDate(date, { includeTime: true })}
              >
                {formatTimeAgo(date)}
              </time>
            ) : (
              "—"
            )}
          </ClientOnly>
        </div>
      </div>
      <div role="cell" className="post-row-actions">
        <ActionMenu
          label={m.admin_posts_more_named({ title })}
          items={actions}
          triggerClassName={iconButtonClass({
            className:
              "pointer-coarse:size-11 aria-expanded:bg-(--fuwari-btn-regular-bg) aria-expanded:text-(--fuwari-fg)",
          })}
        />
      </div>
    </div>
  );
}
