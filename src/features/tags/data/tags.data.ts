import { and, asc, count, desc, eq, gt, lte, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { PostsTable, PostTagsTable, TagsTable } from "@/lib/db/schema";

/**
 * Get all tags, optionally sorted
 */
export async function getAllTags(
  db: DB,
  options: {
    sortBy?: "name" | "createdAt";
    sortDir?: "asc" | "desc";
  } = {},
) {
  const { sortBy = "name", sortDir = "asc" } = options;

  const orderFn = sortDir === "asc" ? asc : desc;
  const orderColumn =
    sortBy === "createdAt" ? TagsTable.createdAt : TagsTable.name;

  return await db.select().from(TagsTable).orderBy(orderFn(orderColumn));
}

/**
 * Get all tags with their post counts
 */
export async function getAllTagsWithCount(
  db: DB,
  options: {
    sortBy?: "name" | "createdAt" | "postCount";
    sortDir?: "asc" | "desc";
    publicOnly?: boolean;
  } = {},
) {
  const { sortBy = "name", sortDir = "asc", publicOnly = false } = options;

  const query = db
    .select({
      id: TagsTable.id,
      name: TagsTable.name,
      createdAt: TagsTable.createdAt,
      postCount: count(PostTagsTable.postId).as("postCount"),
    })
    .from(TagsTable)
    .leftJoin(PostTagsTable, eq(TagsTable.id, PostTagsTable.tagId))
    .groupBy(TagsTable.id)
    .$dynamic();

  if (publicOnly) {
    // Only count published posts
    query
      .innerJoin(PostsTable, eq(PostTagsTable.postId, PostsTable.id))
      .where(
        and(
          eq(PostsTable.status, "published"),
          lte(PostsTable.publishedAt, new Date()),
        ),
      )
      .having(gt(count(PostTagsTable.postId), 0));
  }

  const orderFn = sortDir === "asc" ? asc : desc;

  if (sortBy === "postCount") {
    query.orderBy(orderFn(sql`postCount`));
  } else if (sortBy === "createdAt") {
    query.orderBy(orderFn(TagsTable.createdAt));
  } else {
    query.orderBy(orderFn(TagsTable.name));
  }

  return await query;
}

/**
 * Find a tag by ID
 */
export async function findTagById(db: DB, id: number) {
  return await db.query.TagsTable.findFirst({
    where: eq(TagsTable.id, id),
  });
}

/**
 * Find a tag by name
 */
export async function findTagByName(db: DB, name: string) {
  return await db.query.TagsTable.findFirst({
    where: eq(TagsTable.name, name),
  });
}

/**
 * Insert a new tag
 */
export async function insertTag(db: DB, data: typeof TagsTable.$inferInsert) {
  const [tag] = await db.insert(TagsTable).values(data).returning();
  return tag;
}

/**
 * Update a tag
 */
export async function updateTag(
  db: DB,
  id: number,
  data: Partial<Omit<typeof TagsTable.$inferInsert, "id" | "createdAt">>,
) {
  const [tag] = await db
    .update(TagsTable)
    .set(data)
    .where(eq(TagsTable.id, id))
    .returning();
  return tag;
}

/**
 * Delete a tag
 */
export async function deleteTag(db: DB, id: number) {
  await db.delete(TagsTable).where(eq(TagsTable.id, id));
}

/**
 * Get tags for a specific post
 */
export async function getTagsByPostId(db: DB, postId: number) {
  const results = await db
    .select({
      id: TagsTable.id,
      name: TagsTable.name,
      createdAt: TagsTable.createdAt,
    })
    .from(PostTagsTable)
    .innerJoin(TagsTable, eq(PostTagsTable.tagId, TagsTable.id))
    .where(eq(PostTagsTable.postId, postId))
    .orderBy(asc(TagsTable.name));

  return results;
}

/**
 * Set tags for a post (replace all existing tags).
 * Uses db.batch() to execute delete + insert in a single roundtrip.
 */
export async function setPostTags(
  db: DB,
  postId: number,
  tagIds: Array<number>,
) {
  const batchQueries: Array<BatchItem<"sqlite">> = [];

  // 1. 删除所有现有关联
  const deleteQuery = db
    .delete(PostTagsTable)
    .where(eq(PostTagsTable.postId, postId));

  // 2. 插入新关联
  if (tagIds.length > 0) {
    batchQueries.push(
      db.insert(PostTagsTable).values(
        tagIds.map((tagId) => ({
          postId,
          tagId,
        })),
      ),
    );
  }

  // 3. 批量执行 - 单次 roundtrip
  await db.batch([deleteQuery, ...batchQueries]);
}

/**
 * Check if a tag name exists
 */
export async function nameExists(
  db: DB,
  name: string,
  options: { excludeId?: number } = {},
): Promise<boolean> {
  const { excludeId } = options;
  const conditions = [eq(TagsTable.name, name)];
  if (excludeId) {
    conditions.push(ne(TagsTable.id, excludeId));
  }
  const results = await db
    .select({ id: TagsTable.id })
    .from(TagsTable)
    .where(and(...conditions))
    .limit(1);
  return results.length > 0;
}

/**
 * Delete all tag associations for a post.
 */
export async function deletePostTagAssociations(db: DB, postId: number) {
  await db.delete(PostTagsTable).where(eq(PostTagsTable.postId, postId));
}

/**
 * Get published posts associated with a tag (for cache invalidation)
 */
export async function getPublishedPostsByTagId(db: DB, tagId: number) {
  const results = await db
    .select({
      id: PostsTable.id,
      slug: PostsTable.slug,
    })
    .from(PostTagsTable)
    .innerJoin(PostsTable, eq(PostTagsTable.postId, PostsTable.id))
    .where(
      and(
        eq(PostTagsTable.tagId, tagId),
        eq(PostsTable.status, "published"),
        lte(PostsTable.publishedAt, new Date()),
      ),
    );

  return results;
}
