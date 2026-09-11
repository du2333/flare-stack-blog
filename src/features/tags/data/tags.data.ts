import { and, asc, count, countDistinct, desc, eq, ne, sql } from "drizzle-orm";
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
  if (publicOnly) {
    const orderFn = sortDir === "asc" ? asc : desc;
    return await db
      .select({
        id: TagsTable.id,
        name: TagsTable.name,
        createdAt: TagsTable.createdAt,
        postCount: countDistinct(PostsTable.id).as("postCount"),
      })
      .from(PostsTable)
      .innerJoin(
        sql`json_each(${PostsTable.publicSnapshotJson}, '$.tagIds') AS public_tag`,
        sql`true`,
      )
      .innerJoin(TagsTable, eq(TagsTable.id, sql`public_tag.value`))
      .where(sql`${PostsTable.publicSnapshotJson} IS NOT NULL`)
      .groupBy(TagsTable.id)
      .orderBy(
        orderFn(
          sortBy === "postCount"
            ? sql`postCount`
            : sortBy === "createdAt"
              ? TagsTable.createdAt
              : TagsTable.name,
        ),
      );
  }

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
 * Get published posts associated with a tag (for cache invalidation)
 */
export async function getPublishedPostsByTagId(db: DB, tagId: number) {
  const results = await db
    .select({
      id: PostsTable.id,
      slug: sql<string>`coalesce(${PostsTable.publicSlug}, ${PostsTable.slug})`.as(
        "slug",
      ),
    })
    .from(PostsTable)
    .where(
      and(
        sql`EXISTS (SELECT 1 FROM json_each(${PostsTable.publicSnapshotJson}, '$.tagIds') AS public_tag WHERE public_tag.value = ${tagId})`,
        sql`${PostsTable.publicSnapshotJson} IS NOT NULL`,
      ),
    );

  return results;
}
