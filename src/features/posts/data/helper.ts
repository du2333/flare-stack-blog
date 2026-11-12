import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { PostStatus } from "@/lib/db/schema";
import type { AdminTaxonomyFilter } from "@/features/posts/schema/posts.schema";
import { CommentsTable, PostTagsTable, PostsTable } from "@/lib/db/schema";
import { hasPublicTag } from "@/features/posts/data/public-assignments.data";
import { containsText } from "@/lib/db/text-match";

export type SortField =
  | "publishedAt"
  | "updatedAt"
  | "createdAt"
  | "id"
  | "commentCount";
export type SortDirection = "ASC" | "DESC";

export function adminPostTextColumns(taxonomy?: AdminTaxonomyFilter) {
  if (taxonomy?.scope !== "public")
    return {
      title: PostsTable.title,
      summary: PostsTable.summary,
      slug: PostsTable.slug,
    };
  return {
    title: sql<string>`coalesce(json_extract(${PostsTable.publicSnapshotJson}, '$.title'), ${PostsTable.title})`,
    summary: sql<
      string | null
    >`json_extract(${PostsTable.publicSnapshotJson}, '$.summary')`,
    slug: sql<string>`coalesce(json_extract(${PostsTable.publicSnapshotJson}, '$.slug'), ${PostsTable.publicSlug}, ${PostsTable.slug})`,
  };
}
/**
 * A Published Post whose draft fingerprint differs from the one taken at
 * publishing. `IS NOT` compares nulls, but callers settle null fingerprints
 * first (see unpublished-changes.service).
 */
export function unpublishedChangesSql(): SQL<boolean> {
  return sql<boolean>`(${PostsTable.status} = 'published' AND ${PostsTable.draftFingerprint} IS NOT ${PostsTable.publishedFingerprint})`;
}
/** The published Comments of a Post, replies included; deleted ones do not count. */
export function commentCountSql(): SQL<number> {
  // The outer id is written out: a one-table query renders `${PostsTable.id}`
  // unqualified, which the subquery would read as the Comment's own id.
  return sql<number>`(SELECT count(*) FROM ${CommentsTable} WHERE ${CommentsTable.postId} = "posts"."id" AND ${CommentsTable.status} = 'published')`;
}
function uncategorized(): SQL {
  return sql`${PostsTable.categoryId} IS NULL`;
}
function hasTag(tagId: number): SQL {
  return sql`EXISTS (SELECT 1 FROM ${PostTagsTable} WHERE ${PostTagsTable.postId} = ${PostsTable.id} AND ${PostTagsTable.tagId} = ${tagId})`;
}
/** Public scope reads the public assignments, current scope the draft's. */
function taxonomyWhereClause(taxonomy: AdminTaxonomyFilter): SQL {
  const isPublic = taxonomy.scope === "public";
  if (taxonomy.kind === "category")
    return eq(
      isPublic ? PostsTable.publicCategoryId : PostsTable.categoryId,
      taxonomy.id,
    );
  if (taxonomy.kind === "uncategorized")
    return isPublic
      ? sql`${PostsTable.publicCategoryId} IS NULL`
      : uncategorized();
  return isPublic ? hasPublicTag(taxonomy.id) : hasTag(taxonomy.id);
}

export type PostFilters = {
  status?: PostStatus;
  publicOnly?: boolean;
  search?: string;
  taxonomy?: AdminTaxonomyFilter;
  categoryId?: number;
  uncategorized?: boolean;
  tagId?: number;
  /** Only Published Posts with Unpublished Changes. */
  hasUnpublishedChanges?: boolean;
  /** Only these Posts. */
  ids?: Array<number>;
};

export function buildPostWhereClause(options: PostFilters) {
  const whereClauses = [];
  if (options.taxonomy)
    whereClauses.push(taxonomyWhereClause(options.taxonomy));
  if (options.categoryId !== undefined)
    whereClauses.push(eq(PostsTable.categoryId, options.categoryId));
  if (options.uncategorized) whereClauses.push(uncategorized());
  if (options.tagId !== undefined) whereClauses.push(hasTag(options.tagId));

  if (options.ids) whereClauses.push(inArray(PostsTable.id, options.ids));
  if (options.status) {
    whereClauses.push(eq(PostsTable.status, options.status));
  }
  if (options.hasUnpublishedChanges) {
    whereClauses.push(unpublishedChangesSql());
  }

  if (options.publicOnly || options.taxonomy?.scope === "public") {
    whereClauses.push(sql`${PostsTable.publicSnapshotJson} IS NOT NULL`);
  }

  if (options.search) {
    const searchTerm = options.search.trim();
    if (searchTerm) {
      const fields = adminPostTextColumns(options.taxonomy);
      whereClauses.push(
        or(
          containsText(fields.title, searchTerm),
          containsText(fields.summary, searchTerm),
          containsText(fields.slug, searchTerm),
          // The public page may still carry the title and slug it was
          // published with after the draft's changed, and a reader looking
          // for it by what the site shows must find it.
          containsText(
            sql`json_extract(${PostsTable.publicSnapshotJson}, '$.title')`,
            searchTerm,
          ),
          containsText(PostsTable.publicSlug, searchTerm),
        ),
      );
    }
  }

  return whereClauses.length > 0 ? and(...whereClauses) : undefined;
}

export function buildPostOrderByClause(
  sortDir?: SortDirection,
  sortBy?: SortField,
  publicSnapshot = false,
): SQL[] {
  const direction = sortDir ?? "DESC";
  const field = sortBy ?? "updatedAt";
  const orderFn = direction === "DESC" ? desc : asc;
  const primary = orderFn(
    field === "commentCount"
      ? commentCountSql()
      : publicSnapshot && field === "publishedAt"
        ? sql`json_extract(${PostsTable.publicSnapshotJson}, '$.publishedAt')`
        : PostsTable[field],
  );
  // The id is an immutable primary key, so it keeps offset pagination stable
  // when rows share the sorted value or are written while a client pages.
  return field === "id" ? [primary] : [primary, orderFn(PostsTable.id)];
}
