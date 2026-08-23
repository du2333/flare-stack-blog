import { count, desc, eq } from "drizzle-orm";
import { CommentsTable, PostsTable, user as UserTable } from "@/lib/db/schema";

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
