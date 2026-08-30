import { and, desc, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { CommentsTable, PostsTable, user as UserTable } from "@/lib/db/schema";

export async function listRecentPosts(db: DB, limit: number) {
  return db
    .select({
      id: PostsTable.id,
      title: PostsTable.title,
      status: PostsTable.status,
      pinnedAt: PostsTable.pinnedAt,
      updatedAt: PostsTable.updatedAt,
    })
    .from(PostsTable)
    .orderBy(desc(PostsTable.updatedAt), desc(PostsTable.id))
    .limit(limit);
}

export async function listRecentVisitorComments(db: DB, limit: number) {
  return db
    .select({
      id: CommentsTable.id,
      content: CommentsTable.content,
      createdAt: CommentsTable.createdAt,
      userName: UserTable.name,
      postTitle: sql<string>`coalesce(json_extract(${PostsTable.publicSnapshotJson}, '$.title'), ${PostsTable.title})`,
      postSlug: PostsTable.publicSlug,
    })
    .from(CommentsTable)
    .innerJoin(PostsTable, eq(CommentsTable.postId, PostsTable.id))
    .leftJoin(UserTable, eq(CommentsTable.userId, UserTable.id))
    .where(
      and(
        eq(CommentsTable.status, "published"),
        isNotNull(PostsTable.publicSnapshotJson),
        isNotNull(PostsTable.publicSlug),
        or(isNull(UserTable.role), ne(UserTable.role, "admin")),
      ),
    )
    .orderBy(desc(CommentsTable.createdAt))
    .limit(limit);
}
