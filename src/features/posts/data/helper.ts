import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import type { PostStatus } from "@/lib/db/schema";
import type { AdminTaxonomyFilter } from "@/features/posts/schema/posts.schema";
import { CategoriesTable, PostTagsTable, PostsTable } from "@/lib/db/schema";

export type SortField = "publishedAt" | "updatedAt";
export type SortDirection = "ASC" | "DESC";

export function escapeLikeString(str: string) {
  return str.replace(/[%_\\]/g, "\\$&");
}

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
export function taxonomyWhereClause(taxonomy: AdminTaxonomyFilter): SQL {
  if (taxonomy.scope === "current") {
    if (taxonomy.kind === "category")
      return eq(PostsTable.categoryId, taxonomy.id);
    if (taxonomy.kind === "uncategorized")
      return sql`${PostsTable.categoryId} IS NULL`;
    return sql`EXISTS (SELECT 1 FROM ${PostTagsTable} WHERE ${PostTagsTable.postId} = ${PostsTable.id} AND ${PostTagsTable.tagId} = ${taxonomy.id})`;
  }
  const publicPost = sql`${PostsTable.publicSnapshotJson} IS NOT NULL`;
  if (taxonomy.kind === "category")
    return sql`${publicPost} AND json_extract(${PostsTable.publicSnapshotJson}, '$.categoryId') = ${taxonomy.id}`;
  if (taxonomy.kind === "uncategorized")
    return sql`${publicPost} AND NOT EXISTS (SELECT 1 FROM ${CategoriesTable} WHERE ${CategoriesTable.id} = json_extract(${PostsTable.publicSnapshotJson}, '$.categoryId'))`;
  return sql`${publicPost} AND EXISTS (SELECT 1 FROM json_each(${PostsTable.publicSnapshotJson}, '$.tagIds') AS snapshot_tag WHERE snapshot_tag.value = ${taxonomy.id})`;
}

export function buildPostWhereClause(options: {
  status?: PostStatus;
  publicOnly?: boolean;
  search?: string;
  taxonomy?: AdminTaxonomyFilter;
}) {
  const whereClauses = [];
  if (options.taxonomy)
    whereClauses.push(taxonomyWhereClause(options.taxonomy));

  if (options.status) {
    whereClauses.push(eq(PostsTable.status, options.status));
  }

  if (options.publicOnly) {
    whereClauses.push(sql`${PostsTable.publicSnapshotJson} IS NOT NULL`);
  }

  if (options.search) {
    const searchTerm = options.search.trim();
    if (searchTerm) {
      const pattern = `%${escapeLikeString(searchTerm)}%`;
      const fields = adminPostTextColumns(options.taxonomy);
      whereClauses.push(
        or(
          sql`${fields.title} LIKE ${pattern} ESCAPE '\\'`,
          sql`${fields.summary} LIKE ${pattern} ESCAPE '\\'`,
          sql`${fields.slug} LIKE ${pattern} ESCAPE '\\'`,
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
): SQL {
  const direction = sortDir ?? "DESC";
  const field = sortBy ?? "updatedAt";
  const orderFn = direction === "DESC" ? desc : asc;
  return orderFn(
    publicSnapshot && field === "publishedAt"
      ? sql`json_extract(${PostsTable.publicSnapshotJson}, '$.publishedAt')`
      : PostsTable[field],
  );
}
