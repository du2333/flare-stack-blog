import type { Post } from "@/lib/db/schema";

/** Post fields used by admin list rows. */
export type AdminPostListItem = Omit<
  Post,
  | "contentJson"
  | "publicSnapshotJson"
  | "coverMediaId"
  | "categoryId"
  | "publicCategoryId"
  | "saveToken"
  | "draftFingerprint"
  | "publishedFingerprint"
> & {
  /** A published post whose draft differs from what is live. */
  hasUnpublishedChanges: boolean;
  /** Published Comments, replies included. */
  commentCount: number;
  /** Views of the last 30 days; absent when unknown, which is not 0. */
  viewCount?: number;
  /** The draft's Category and Tags (Current Assignment). */
  category: { id: number; name: string } | null;
  tags: Array<{ id: number; name: string }>;
};

/** Status filter options for posts list */
export const STATUS_FILTERS = ["ALL", "PUBLISHED", "CHANGED", "DRAFT"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** Sort fields options */
export const SORT_FIELDS = [
  "publishedAt",
  "updatedAt",
  "viewCount",
  "commentCount",
] as const;
export type SortField = (typeof SORT_FIELDS)[number];

/**
 * Whether the views of the last 30 days can be read: only `ready` carries
 * them. The Overview tells the same four apart.
 */
export type PostPopularity = "unconfigured" | "missing" | "expired" | "ready";

/** Posts per page: enough to fill a 1440x900 screen of 52px rows. */
export const POSTS_PER_PAGE = 20;

/**
 * From here the toolbar is one row with the sort beside the search; below it
 * tabs and search take a row each and the sort lives in the filter sheet.
 * Keep it aligned with the lg breakpoint in content-workspace.css.
 */
export const WIDE_TOOLBAR_QUERY = "(min-width: 1024px)";

/** Where the pagination scrolls with the list instead of staying pinned. */
export const PHONE_LAYOUT_QUERY = "(max-width: 767px)";

/** A category id, or "none" for posts without one. */
export type CategoryFilter = number | "none";

/**
 * Convert StatusFilter to the list API's filters. "CHANGED" selects published
 * posts with Unpublished Changes, which the server filters on its own.
 */
export function statusFilterToApi(filter: StatusFilter): {
  status?: "published" | "draft";
  hasUnpublishedChanges?: true;
} {
  switch (filter) {
    case "ALL":
      return {};
    case "PUBLISHED":
      return { status: "published" };
    case "CHANGED":
      return { hasUnpublishedChanges: true };
    case "DRAFT":
      return { status: "draft" };
  }
}
