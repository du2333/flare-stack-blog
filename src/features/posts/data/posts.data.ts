import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  like,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { SortDirection, SortField } from "@/features/posts/data/helper";
import {
  adminPostTextColumns,
  buildPostOrderByClause,
  buildPostWhereClause,
} from "@/features/posts/data/helper";
import { mapSnapshotToPublicPost } from "@/features/posts/public-snapshot";
import type {
  AdminTaxonomyFilter,
  PostItem,
  PostListItem,
} from "@/features/posts/schema/posts.schema";
import { isPostBodyEmpty } from "@/features/posts/utils/is-post-body-empty";
import type { PostStatus, PublicPostSnapshot, Tag } from "@/lib/db/schema";
import { CategoriesTable, PostsTable, TagsTable } from "@/lib/db/schema";

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_SITEMAP_BATCH_SIZE = 500;

const snapshotPublishedAt = sql<string>`json_extract(${PostsTable.publicSnapshotJson}, '$.publishedAt')`;
const snapshotPinnedAt = sql<string>`json_extract(${PostsTable.publicSnapshotJson}, '$.pinnedAt')`;

async function hydratePublicPosts(
  db: DB,
  rows: Array<{
    id: number;
    status: PostStatus;
    createdAt: Date;
    updatedAt: Date;
    publicSnapshotJson: PublicPostSnapshot | null;
  }>,
): Promise<Array<PostItem>> {
  const tagIds = [
    ...new Set(rows.flatMap((row) => row.publicSnapshotJson?.tagIds ?? [])),
  ];
  const categoryIds = [
    ...new Set(
      rows.flatMap((row) => {
        const categoryId = row.publicSnapshotJson?.categoryId;
        return categoryId == null ? [] : [categoryId];
      }),
    ),
  ];
  const tags =
    tagIds.length > 0
      ? await db.select().from(TagsTable).where(inArray(TagsTable.id, tagIds))
      : [];
  const categories =
    categoryIds.length > 0
      ? await db
          .select()
          .from(CategoriesTable)
          .where(inArray(CategoriesTable.id, categoryIds))
      : [];
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );

  return rows.flatMap((row) => {
    const snapshot = row.publicSnapshotJson;
    if (!snapshot) return [];
    const itemTags = snapshot.tagIds
      .map((id) => tagsById.get(id))
      .filter((tag): tag is Tag => !!tag);
    const itemCategory =
      snapshot.categoryId == null
        ? null
        : (categoriesById.get(snapshot.categoryId) ?? null);
    const item = mapSnapshotToPublicPost(
      row,
      itemTags,
      itemCategory ? { id: itemCategory.id, name: itemCategory.name } : null,
    );
    return item ? [item] : [];
  });
}

export type SitemapPostRow = {
  id: number;
  slug: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  publishedAt: Date | null;
};

export async function insertPost(db: DB, data: typeof PostsTable.$inferInsert) {
  const [post] = await db.insert(PostsTable).values(data).returning();
  return post;
}

export async function getPosts(
  db: DB,
  options: {
    offset?: number;
    limit?: number;
    status?: PostStatus;
    publicOnly?: boolean;
    search?: string;
    taxonomy?: AdminTaxonomyFilter;
    sortDir?: SortDirection;
    sortBy?: SortField;
  } = {},
) {
  const {
    offset = 0,
    limit = DEFAULT_PAGE_SIZE,
    sortDir,
    sortBy,
    ...filters
  } = options;
  const whereClause = buildPostWhereClause(filters);
  const publicScope = filters.taxonomy?.scope === "public";
  const orderByClause = buildPostOrderByClause(sortDir, sortBy, publicScope);
  const snapshotDate = (field: "publishedAt" | "pinnedAt") =>
    sql<
      string | null
    >`json_extract(${PostsTable.publicSnapshotJson}, ${`$.${field}`})`.mapWith(
      (value) => (value == null ? null : new Date(value)),
    );

  const posts = await db
    .select({
      id: PostsTable.id,
      ...adminPostTextColumns(filters.taxonomy),
      status: PostsTable.status,
      publishedAt: publicScope
        ? snapshotDate("publishedAt")
        : PostsTable.publishedAt,
      pinnedAt: publicScope ? snapshotDate("pinnedAt") : PostsTable.pinnedAt,
      categoryId: PostsTable.categoryId,
      createdAt: PostsTable.createdAt,
      updatedAt: PostsTable.updatedAt,
    })
    .from(PostsTable)
    .limit(Math.min(limit, 50))
    .offset(offset)
    .orderBy(orderByClause)
    .where(whereClause);
  return posts;
}

export async function getPostsCount(
  db: DB,
  options: {
    status?: PostStatus;
    publicOnly?: boolean;
    search?: string;
    taxonomy?: AdminTaxonomyFilter;
  } = {},
) {
  const whereClause = buildPostWhereClause(options);
  const totalNumberofPosts = await db
    .select({ count: count() })
    .from(PostsTable)
    .where(whereClause);
  return totalNumberofPosts[0].count;
}

/** Status facets use the same search predicate as the paginated Admin list. */
export async function getAdminPostStatusCounts(
  db: DB,
  options: {
    publicOnly?: boolean;
    search?: string;
    taxonomy?: AdminTaxonomyFilter;
  } = {},
) {
  const rows = await db
    .select({ status: PostsTable.status, count: count() })
    .from(PostsTable)
    .where(buildPostWhereClause(options))
    .groupBy(PostsTable.status);
  return {
    draft: rows.find((row) => row.status === "draft")?.count ?? 0,
    published: rows.find((row) => row.status === "published")?.count ?? 0,
  };
}

export async function findReusableEmptyDraft(db: DB) {
  const rows = await db
    .select({
      id: PostsTable.id,
      contentJson: PostsTable.contentJson,
    })
    .from(PostsTable)
    .where(
      and(eq(PostsTable.status, "draft"), sql`trim(${PostsTable.title}) = ''`),
    )
    .orderBy(desc(PostsTable.updatedAt))
    .limit(20);

  for (const row of rows) {
    if (isPostBodyEmpty(row.contentJson)) {
      return row;
    }
  }
  return null;
}

/**
 * Get posts with cursor-based pagination
 * @param cursor - The id of the last item from previous page
 * @param limit - Number of items per page
 */
export async function getPostsCursor(
  db: DB,
  options: {
    cursor?: number;
    limit?: number;
    publicOnly?: boolean;
    tagName?: string;
    categoryName?: string;
    uncategorized?: boolean;
    excludePinned?: boolean;
  } = {},
): Promise<{
  items: Array<PostListItem>;
  nextCursor: number | null;
}> {
  const {
    cursor,
    limit = DEFAULT_PAGE_SIZE,
    publicOnly = true,
    tagName,
    categoryName,
    uncategorized,
    excludePinned,
  } = options;

  const conditions = [];
  const baseConditions = buildPostWhereClause({ publicOnly });
  if (baseConditions) {
    conditions.push(baseConditions);
  }

  if (cursor) {
    const reference = await db.query.PostsTable.findFirst({
      where: eq(PostsTable.id, cursor),
      columns: { publicSnapshotJson: true, id: true },
    });
    const referencePublishedAt = reference?.publicSnapshotJson?.publishedAt;

    if (referencePublishedAt) {
      conditions.push(
        or(
          lt(snapshotPublishedAt, referencePublishedAt),
          and(
            eq(snapshotPublishedAt, referencePublishedAt),
            lt(PostsTable.id, reference.id),
          ),
        ),
      );
    } else if (reference) {
      conditions.push(lt(PostsTable.id, cursor));
    }
  }

  if (tagName) {
    conditions.push(
      sql`EXISTS (
        SELECT 1
        FROM json_each(json_extract(${PostsTable.publicSnapshotJson}, '$.tagIds'))
        JOIN ${TagsTable} ON ${TagsTable.id} = json_each.value
        WHERE ${TagsTable.name} = ${tagName}
      )`,
    );
  }

  if (uncategorized) {
    conditions.push(
      sql`json_extract(${PostsTable.publicSnapshotJson}, '$.categoryId') IS NULL`,
    );
  } else if (categoryName) {
    conditions.push(
      sql`EXISTS (
        SELECT 1
        FROM ${CategoriesTable}
        WHERE ${CategoriesTable.id} = json_extract(${PostsTable.publicSnapshotJson}, '$.categoryId')
          AND ${CategoriesTable.name} = ${categoryName}
      )`,
    );
  }

  if (excludePinned) {
    conditions.push(sql`${snapshotPinnedAt} IS NULL`);
  }

  const itemsWithPotentialNext = await db
    .select({
      id: PostsTable.id,
      status: PostsTable.status,
      createdAt: PostsTable.createdAt,
      updatedAt: PostsTable.updatedAt,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(snapshotPublishedAt), desc(PostsTable.id))
    .limit(limit + 1);

  const hasMore = itemsWithPotentialNext.length > limit;
  const rows = itemsWithPotentialNext.slice(0, limit);
  const items = await hydratePublicPosts(db, rows);
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return { items, nextCursor };
}

export async function getPublishedPostsForSitemapBatch(
  db: DB,
  options: {
    cursor?: {
      publishedAt: Date;
      id: number;
    };
    limit?: number;
  } = {},
): Promise<Array<SitemapPostRow>> {
  const { cursor, limit = DEFAULT_SITEMAP_BATCH_SIZE } = options;

  const cursorPublishedAt = cursor?.publishedAt.toISOString();
  const rows = await db
    .select({
      id: PostsTable.id,
      publicSlug: PostsTable.publicSlug,
      createdAt: PostsTable.createdAt,
      updatedAt: PostsTable.updatedAt,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        cursor && cursorPublishedAt
          ? or(
              lt(snapshotPublishedAt, cursorPublishedAt),
              and(
                eq(snapshotPublishedAt, cursorPublishedAt),
                lt(PostsTable.id, cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(snapshotPublishedAt), desc(PostsTable.id))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    slug: row.publicSlug ?? row.publicSnapshotJson?.slug ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publicSnapshotJson
      ? new Date(row.publicSnapshotJson.publishedAt)
      : null,
  }));
}

export async function findPostById(db: DB, id: number) {
  const post = await db.query.PostsTable.findFirst({
    where: eq(PostsTable.id, id),
    with: {
      postTags: {
        with: {
          tag: true,
        },
      },
      category: true,
    },
  });

  if (!post) return null;

  const tags = post.postTags.map((pt) => pt.tag);
  const { postTags, ...rest } = post;
  return { ...rest, tags };
}

export async function findPinnedPosts(db: DB) {
  const rows = await db
    .select({
      id: PostsTable.id,
      status: PostsTable.status,
      createdAt: PostsTable.createdAt,
      updatedAt: PostsTable.updatedAt,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        sql`${snapshotPinnedAt} IS NOT NULL`,
      ),
    )
    .orderBy(desc(snapshotPinnedAt));

  return hydratePublicPosts(db, rows);
}

export async function findPostsByIds(db: DB, ids: number[]) {
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: PostsTable.id,
      status: PostsTable.status,
      createdAt: PostsTable.createdAt,
      updatedAt: PostsTable.updatedAt,
      publicSnapshotJson: PostsTable.publicSnapshotJson,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        inArray(PostsTable.id, ids),
      ),
    );

  return hydratePublicPosts(db, rows);
}

export async function findPostBySlug(
  db: DB,
  slug: string,
  options: { publicOnly?: boolean } = {},
) {
  const { publicOnly = false } = options;

  if (publicOnly) {
    const row = await db.query.PostsTable.findFirst({
      where: and(
        eq(PostsTable.publicSlug, slug),
        isNotNull(PostsTable.publicSnapshotJson),
      ),
    });
    if (!row?.publicSnapshotJson) return null;
    const [item] = await hydratePublicPosts(db, [row]);
    return item
      ? {
          ...row,
          ...item,
          contentJson: row.publicSnapshotJson.contentJson,
          tags: item.tags ?? [],
        }
      : null;
  }

  const post = await db.query.PostsTable.findFirst({
    where: eq(PostsTable.slug, slug),
    with: {
      postTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!post) return null;

  const tags = post.postTags.map((pt) => pt.tag);
  const { postTags, ...rest } = post;
  return { ...rest, tags };
}

export async function updatePost(
  db: DB,
  id: number,
  data: Partial<Omit<typeof PostsTable.$inferInsert, "id" | "createdAt">>,
) {
  await db.update(PostsTable).set(data).where(eq(PostsTable.id, id));
  return await findPostById(db, id);
}

export async function touchPostUpdatedAt(db: DB, id: number) {
  await db
    .update(PostsTable)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(PostsTable.id, id));
}

export async function writePublicSnapshot(
  db: DB,
  id: number,
  snapshot: PublicPostSnapshot,
) {
  await db
    .update(PostsTable)
    .set({
      publicSnapshotJson: snapshot,
      publicSlug: snapshot.slug,
      status: "published",
      updatedAt: sql`${PostsTable.updatedAt}`,
    })
    .where(eq(PostsTable.id, id));
  return await findPostById(db, id);
}

export async function clearPublicSnapshot(db: DB, id: number) {
  await db
    .update(PostsTable)
    .set({
      publicSnapshotJson: null,
      publicSlug: null,
      status: "draft",
      updatedAt: sql`${PostsTable.updatedAt}`,
    })
    .where(eq(PostsTable.id, id));
  return await findPostById(db, id);
}

export async function publicSlugExists(
  db: DB,
  slug: string,
  options: { excludeId?: number } = {},
): Promise<boolean> {
  const conditions = [eq(PostsTable.publicSlug, slug)];
  if (options.excludeId) {
    conditions.push(ne(PostsTable.id, options.excludeId));
  }
  const results = await db
    .select({ id: PostsTable.id })
    .from(PostsTable)
    .where(and(...conditions))
    .limit(1);
  return results.length > 0;
}

export async function deletePost(db: DB, id: number) {
  await db.delete(PostsTable).where(eq(PostsTable.id, id));
}

/**
 * Check if a slug exists in the database
 * @param slug - The slug to check
 * @param excludeId - Optional post ID to exclude (for editing existing posts)
 */
export async function slugExists(
  db: DB,
  slug: string,
  options: { excludeId?: number } = {},
): Promise<boolean> {
  const { excludeId } = options;
  const conditions = [eq(PostsTable.slug, slug)];
  if (excludeId) {
    conditions.push(ne(PostsTable.id, excludeId));
  }
  const results = await db
    .select({ id: PostsTable.id })
    .from(PostsTable)
    .where(and(...conditions))
    .limit(1);
  return results.length > 0;
}

/**
 * 找出所有长得像 "baseSlug-%" 的 Slug
 */
export async function findSimilarSlugs(
  db: DB,
  baseSlug: string,
  options: { excludeId?: number } = {},
) {
  const conditions = [like(PostsTable.slug, `${baseSlug}-%`)];

  // 如果是编辑文章，要排除掉自己，防止把自己算作冲突
  if (options.excludeId) {
    conditions.push(ne(PostsTable.id, options.excludeId));
  }

  const results = await db
    .select({ slug: PostsTable.slug })
    .from(PostsTable)
    .where(and(...conditions));

  return results.map((r) => r.slug);
}

export async function findAdjacentPublicPosts(db: DB, slug: string) {
  const currentPost = await db.query.PostsTable.findFirst({
    where: and(
      eq(PostsTable.publicSlug, slug),
      isNotNull(PostsTable.publicSnapshotJson),
    ),
    columns: { id: true, publicSnapshotJson: true },
  });

  const publishedAt = currentPost?.publicSnapshotJson?.publishedAt;
  if (!currentPost || !publishedAt) {
    return { newer: null, older: null };
  }

  const snapshotTitle = sql<string>`json_extract(${PostsTable.publicSnapshotJson}, '$.title')`;

  const [newer] = await db
    .select({
      slug: PostsTable.publicSlug,
      title: snapshotTitle,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        isNotNull(PostsTable.publicSlug),
        or(
          gt(snapshotPublishedAt, publishedAt),
          and(
            eq(snapshotPublishedAt, publishedAt),
            gt(PostsTable.id, currentPost.id),
          ),
        ),
      ),
    )
    .orderBy(asc(snapshotPublishedAt), asc(PostsTable.id))
    .limit(1);

  const [older] = await db
    .select({
      slug: PostsTable.publicSlug,
      title: snapshotTitle,
    })
    .from(PostsTable)
    .where(
      and(
        isNotNull(PostsTable.publicSnapshotJson),
        isNotNull(PostsTable.publicSlug),
        or(
          lt(snapshotPublishedAt, publishedAt),
          and(
            eq(snapshotPublishedAt, publishedAt),
            lt(PostsTable.id, currentPost.id),
          ),
        ),
      ),
    )
    .orderBy(desc(snapshotPublishedAt), desc(PostsTable.id))
    .limit(1);

  return {
    newer: newer?.slug ? { slug: newer.slug, title: newer.title } : null,
    older: older?.slug ? { slug: older.slug, title: older.title } : null,
  };
}
