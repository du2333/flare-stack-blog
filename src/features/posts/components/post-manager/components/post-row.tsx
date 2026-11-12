import { ClientOnly, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ExternalLink,
  EyeOff,
  Folder,
  Hash,
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
import type { AdminPostListItem, SortField } from "../types";

interface PostRowProps {
  post: AdminPostListItem;
  sortBy: SortField;
  onDelete: (
    post: AdminPostListItem,
    trigger: HTMLButtonElement | null,
  ) => void;
  onTogglePin?: (post: AdminPostListItem) => void;
  pinPending?: boolean;
  onUnpublish?: (post: AdminPostListItem, trigger: HTMLButtonElement) => void;
  /** Filters the list by the post's Category. */
  onFilterCategory?: (id: number) => void;
  /** Filters the list by one of the post's Tags. */
  onFilterTag?: (id: number) => void;
}

/** The columns of the post table, shared with its skeleton. */
export function PostListColgroup() {
  return (
    <colgroup>
      <col />
      <col className="post-list-date-col" />
      <col className="post-list-actions-col" />
    </colgroup>
  );
}

export function PostRow({
  post,
  sortBy,
  onDelete,
  onTogglePin,
  pinPending,
  onUnpublish,
  onFilterCategory,
  onFilterTag,
}: PostRowProps) {
  const title = post.title.trim() || m.common_untitled();
  const date = post[sortBy];
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
  const { category, tags } = post;
  const untaxed = !category && tags.length === 0;
  return (
    <tr>
      <td>
        <div className="post-list-title-line">
          <Link
            to="/admin/posts/edit/$id"
            params={{ id: String(post.id) }}
            className="post-list-title-link"
          >
            {title}
          </Link>
          {post.pinnedAt && (
            <Pin
              size={14}
              role="img"
              aria-label={m.admin_posts_pinned()}
              className="post-list-pin"
            />
          )}
          <PostStatusBadge
            state={postStateOf({
              published,
              hasUnpublishedChanges: post.hasUnpublishedChanges,
            })}
          />
        </div>
        <div className="post-list-meta-line">
          {category && (
            <TaxonomyButton
              icon={<Folder size={12} aria-hidden="true" />}
              label={m.admin_posts_filter_by_category({ name: category.name })}
              name={category.name}
              onClick={
                onFilterCategory && (() => onFilterCategory(category.id))
              }
            />
          )}
          {tags.map((tag) => (
            <TaxonomyButton
              key={tag.id}
              icon={<Hash size={12} aria-hidden="true" />}
              label={m.admin_posts_filter_by_tag({ name: tag.name })}
              name={tag.name}
              onClick={onFilterTag && (() => onFilterTag(tag.id))}
            />
          ))}
          {untaxed && (
            <span className="post-list-uncategorized">
              {m.post_uncategorized()}
            </span>
          )}
        </div>
      </td>
      <td className="post-list-date">
        <span className="post-list-mobile-date-label">
          {sortBy === "publishedAt"
            ? m.admin_posts_time_published()
            : m.admin_posts_time_modified()}{" "}
        </span>
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
      </td>
      <td className="post-list-actions">
        <ActionMenu
          label={m.admin_posts_more_named({ title })}
          items={actions}
          triggerClassName={iconButtonClass({
            className:
              "max-[620px]:size-11 pointer-coarse:size-11 aria-expanded:bg-(--fuwari-btn-regular-bg) aria-expanded:text-(--fuwari-fg)",
          })}
        />
      </td>
    </tr>
  );
}

function TaxonomyButton({
  icon,
  label,
  name,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="plain"
      size="sm"
      className="post-list-taxon"
      icon={icon}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {name}
    </Button>
  );
}
