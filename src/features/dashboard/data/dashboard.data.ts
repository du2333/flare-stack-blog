import { count, desc, eq } from "drizzle-orm";
import { CommentsTable, PostsTable, user as UserTable, GuitarTabMetadataTable } from "@/lib/db/schema";

export async function getPendingCommentsCount(db: DB) {
  const [result] = await db
    .select({ count: count() })
    .from(CommentsTable)
    .where(eq(CommentsTable.status, "pending"));
  return result.count;
}

export async function getPublishedPostsCount(db: DB) {
  const [result] = await db
    .select({ count: count() })
    .from(PostsTable)
    .where(eq(PostsTable.status, "published"));
  return result.count;
}

export async function getDraftsCount(db: DB) {
  const [result] = await db
    .select({ count: count() })
    .from(PostsTable)
    .where(eq(PostsTable.status, "draft"));
  return result.count;
}

export async function getRecentComments(db: DB, limit = 5) {
  return db
    .select()
    .from(CommentsTable)
    .orderBy(desc(CommentsTable.createdAt))
    .limit(limit)
    .leftJoin(UserTable, eq(CommentsTable.userId, UserTable.id))
    .leftJoin(PostsTable, eq(CommentsTable.postId, PostsTable.id));
}

export async function getRecentPosts(db: DB, limit = 5) {
  return db
    .select()
    .from(PostsTable)
    .where(eq(PostsTable.status, "published"))
    .orderBy(desc(PostsTable.publishedAt))
    .limit(limit);
}

export async function getRecentUsers(db: DB, limit = 5) {
  return db
    .select()
    .from(UserTable)
    .orderBy(desc(UserTable.createdAt))
    .limit(limit);
}

export async function getTotalUsersCount(db: DB) {
  const [result] = await db.select({ count: count() }).from(UserTable);
  return result.count;
}

export async function getTotalGuitarTabsCount(db: DB) {
  const [result] = await db
    .select({ count: count() })
    .from(GuitarTabMetadataTable);
  return result.count;
}

export async function getPendingGuitarTabsCount(db: DB) {
  const [result] = await db
    .select({ count: count() })
    .from(GuitarTabMetadataTable)
    .where(eq(GuitarTabMetadataTable.status, "pending"));
  return result.count;
}

export async function getRecentGuitarTabs(db: DB, limit = 10) {
  return db
    .select({
      mediaId: GuitarTabMetadataTable.mediaId,
      title: GuitarTabMetadataTable.title,
      artist: GuitarTabMetadataTable.artist,
      slug: GuitarTabMetadataTable.slug,
      status: GuitarTabMetadataTable.status,
      createdAt: GuitarTabMetadataTable.createdAt,
      uploaderName: UserTable.name,
    })
    .from(GuitarTabMetadataTable)
    .leftJoin(UserTable, eq(GuitarTabMetadataTable.uploaderId, UserTable.id))
    .orderBy(desc(GuitarTabMetadataTable.createdAt))
    .limit(limit);
}
