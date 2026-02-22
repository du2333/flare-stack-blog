import {
  and,
  count,
  desc,
  eq,
  inArray,
  like,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { SortDirection, SortField } from "@/features/posts/data/helper";
import type { PostStatus, Tag } from "@/lib/db/schema";
import type { PostListItem } from "@/features/posts/posts.schema";
import {
  buildPostOrderByClause,
  buildPostWhereClause,
} from "@/features/posts/data/helper";
import { PostTagsTable, PostsTable, TagsTable } from "@/lib/db/schema";

const DEFAULT_PAGE_SIZE = 12;

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
  const orderByClause = buildPostOrderByClause(sortDir, sortBy);

  const posts = await db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      summary: PostsTable.summary,
      readTimeInMinutes: PostsTable.readTimeInMinutes,
      slug: PostsTable.slug,
      status: PostsTable.status,
      publishedAt: PostsTable.publishedAt,
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
  } = {},
) {
  const whereClause = buildPostWhereClause(options);
  const totalNumberofPosts = await db
    .select({ count: count() })
    .from(PostsTable)
    .where(whereClause);
  return totalNumberofPosts[0].count;
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
  } = {},
): Promise<{
  items: Array<PostListItem>;
  nextCursor: number | null;
}> {
  const { cursor, limit = DEFAULT_PAGE_SIZE, publicOnly, tagName } = options;

  // Build base conditions from helper
  const baseConditions = buildPostWhereClause({ publicOnly });

  // Add cursor condition if provided
  const conditions = [];
  if (baseConditions) {
    conditions.push(baseConditions);
  }

  if (cursor) {
    const reference = await db.query.PostsTable.findFirst({
      where: eq(PostsTable.id, cursor),
      columns: { publishedAt: true, id: true },
    });

    if (reference?.publishedAt) {
      conditions.push(
        or(
          lt(PostsTable.publishedAt, reference.publishedAt),
          and(
            eq(PostsTable.publishedAt, reference.publishedAt),
            lt(PostsTable.id, reference.id),
          ),
        ),
      );
    } else if (reference) {
      // Fallback if somehow publishedAt is null (shouldn't happen for published posts)
      conditions.push(lt(PostsTable.id, cursor));
    }
  }

  if (tagName) {
    conditions.push(eq(TagsTable.name, tagName));
  }

  let query = db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      summary: PostsTable.summary,
      readTimeInMinutes: PostsTable.readTimeInMinutes,
      slug: PostsTable.slug,
      status: PostsTable.status,
      publishedAt: PostsTable.publishedAt,
      createdAt: PostsTable.createdAt,
      updatedAt: PostsTable.updatedAt,
    })
    .from(PostsTable)
    .$dynamic();

  if (tagName) {
    query = query
      .innerJoin(PostTagsTable, eq(PostsTable.id, PostTagsTable.postId))
      .innerJoin(TagsTable, eq(PostTagsTable.tagId, TagsTable.id));
  }

  const itemsWithPotentialNext = await query
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(PostsTable.publishedAt), desc(PostsTable.id))
    .limit(limit + 1);

  // Check if there's a next page
  const hasMore = itemsWithPotentialNext.length > limit;
  const items = itemsWithPotentialNext.slice(0, limit) as Array<PostListItem>;

  // Fetch tags for all items
  if (items.length > 0) {
    const postIds = items.map((p) => p.id);
    const tagsResults = await db
      .select({
        postId: PostTagsTable.postId,
        tag: {
          id: TagsTable.id,
          name: TagsTable.name,
          createdAt: TagsTable.createdAt,
        },
      })
      .from(PostTagsTable)
      .innerJoin(TagsTable, eq(PostTagsTable.tagId, TagsTable.id))
      .where(inArray(PostTagsTable.postId, postIds));

    // Map tags back to items
    const tagsByPostId = new Map<number, Array<Tag>>();
    for (const result of tagsResults) {
      const existing = tagsByPostId.get(result.postId) ?? [];
      existing.push(result.tag);
      tagsByPostId.set(result.postId, existing);
    }

    items.forEach((item) => {
      item.tags = tagsByPostId.get(item.id) ?? [];
    });
  }

  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return { items, nextCursor };
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
    },
  });

  if (!post) return null;

  // Flatten tags
  const tags = post.postTags.map((pt) => pt.tag);
  const { postTags, ...rest } = post;
  return { ...rest, tags };
}

export async function findPostBySlug(
  db: DB,
  slug: string,
  options: { publicOnly?: boolean } = {},
) {
  const { publicOnly = false } = options;

  const whereClause = buildPostWhereClause({ publicOnly });
  const post = await db.query.PostsTable.findFirst({
    where: and(eq(PostsTable.slug, slug), whereClause),
    with: {
      postTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!post) return null;

  // Flatten tags
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

export async function getRelatedPostIds(
  db: DB,
  slug: string,
  options: { limit?: number } = {},
) {
  const { limit = 3 } = options;

  // 1. Get current post ID and its tags
  const currentPost = await db.query.PostsTable.findFirst({
    where: eq(PostsTable.slug, slug),
    with: {
      postTags: true,
    },
    columns: { id: true },
  });

  if (!currentPost || currentPost.postTags.length === 0) {
    return [];
  }

  const tagIds = currentPost.postTags.map((pt) => pt.tagId);

  // 2. Find posts that share at least one tag
  // Return only IDs, ordered by match count
  const matchingPosts = await db
    .select({
      id: PostsTable.id,
      matchCount: sql<number>`count(${PostTagsTable.tagId})`.as("match_count"),
    })
    .from(PostsTable)
    .innerJoin(PostTagsTable, eq(PostsTable.id, PostTagsTable.postId))
    .where(
      and(
        ne(PostsTable.id, currentPost.id),
        eq(PostsTable.status, "published"),
        inArray(PostTagsTable.tagId, tagIds),
      ),
    )
    .groupBy(PostsTable.id)
    .orderBy(desc(sql`match_count`), desc(PostsTable.publishedAt))
    .limit(limit);

  return matchingPosts.map((p) => p.id);
}

export async function getPublicPostsByIds(db: DB, ids: Array<number>) {
  if (ids.length === 0) return [];

  const whereClause = buildPostWhereClause({ publicOnly: true });

  const posts = await db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      summary: PostsTable.summary,
      readTimeInMinutes: PostsTable.readTimeInMinutes,
      slug: PostsTable.slug,
      status: PostsTable.status,
      publishedAt: PostsTable.publishedAt,
      createdAt: PostsTable.createdAt,
      updatedAt: PostsTable.updatedAt,
    })
    .from(PostsTable)
    .where(and(inArray(PostsTable.id, ids), whereClause));

  return posts;
}

/**
 * Fetch full post data (including tags and content) for export or other detailed use cases.
 * Uses Drizzle relational queries for efficiency.
 */
export async function findFullPosts(
  db: DB,
  options: {
    ids?: Array<number>;
    status?: PostStatus;
  } = {},
) {
  const { ids, status } = options;
  const conditions = [];

  if (ids && ids.length > 0) {
    conditions.push(inArray(PostsTable.id, ids));
  }
  if (status) {
    conditions.push(eq(PostsTable.status, status));
  }

  const results = await db.query.PostsTable.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      postTags: {
        with: {
          tag: true,
        },
      },
    },
    orderBy: [desc(PostsTable.createdAt)],
  });

  return results.map((post) => {
    const { postTags, ...rest } = post;
    return {
      ...rest,
      tags: postTags.map((pt) => pt.tag),
    };
  });
}
