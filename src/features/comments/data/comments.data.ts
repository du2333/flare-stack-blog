import { and, count, desc, eq, exists, inArray, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import {
  COMMENT_PAGE_SIZE,
  COMMENT_REPLY_PREVIEW_LIMIT,
} from "@/features/comments/comment-thread";
import { buildCommentWhereClause } from "@/features/comments/data/helper";
import type { CommentStatus } from "@/lib/db/schema";
import { CommentsTable, user } from "@/lib/db/schema";

const commentListColumns = {
  id: CommentsTable.id,
  content: CommentsTable.content,
  rootId: CommentsTable.rootId,
  replyToCommentId: CommentsTable.replyToCommentId,
  postId: CommentsTable.postId,
  userId: CommentsTable.userId,
  status: CommentsTable.status,
  createdAt: CommentsTable.createdAt,
  updatedAt: CommentsTable.updatedAt,
  user: {
    id: user.id,
    name: user.name,
    image: user.image,
    role: user.role,
  },
};

export async function insertComment(
  db: DB,
  data: typeof CommentsTable.$inferInsert,
) {
  const [comment] = await db.insert(CommentsTable).values(data).returning();
  return comment;
}

export async function findCommentById(db: DB, id: number) {
  return await db.query.CommentsTable.findFirst({
    where: eq(CommentsTable.id, id),
  });
}

function visibleRootCondition(db: DB, postId: number) {
  const threadReplies = alias(CommentsTable, "thread_replies");
  return and(
    eq(CommentsTable.postId, postId),
    isNull(CommentsTable.rootId),
    or(
      eq(CommentsTable.status, "published"),
      and(
        eq(CommentsTable.status, "deleted"),
        exists(
          db
            .select({ id: threadReplies.id })
            .from(threadReplies)
            .where(
              and(
                eq(threadReplies.rootId, CommentsTable.id),
                eq(threadReplies.status, "published"),
              ),
            ),
        ),
      ),
    ),
  );
}

export async function getRootCommentsByPostId(
  db: DB,
  postId: number,
  options: {
    offset?: number;
    limit?: number;
  } = {},
) {
  const { offset = 0, limit = COMMENT_PAGE_SIZE } = options;

  const comments = await db
    .select(commentListColumns)
    .from(CommentsTable)
    .leftJoin(user, eq(CommentsTable.userId, user.id))
    .where(visibleRootCondition(db, postId))
    .orderBy(desc(CommentsTable.createdAt))
    .limit(Math.min(limit, 100))
    .offset(offset);

  return comments;
}

export async function getVisibleRootById(
  db: DB,
  postId: number,
  rootId: number,
) {
  const comments = await db
    .select(commentListColumns)
    .from(CommentsTable)
    .leftJoin(user, eq(CommentsTable.userId, user.id))
    .where(and(visibleRootCondition(db, postId), eq(CommentsTable.id, rootId)))
    .limit(1);

  return comments[0] ?? null;
}

export async function getPublishedRootCommentsCount(db: DB, postId: number) {
  const result = await db
    .select({ count: count() })
    .from(CommentsTable)
    .where(
      and(
        eq(CommentsTable.postId, postId),
        isNull(CommentsTable.rootId),
        eq(CommentsTable.status, "published"),
      ),
    );

  return result[0].count;
}

export async function getPublishedReplyCountsByRootIds(
  db: DB,
  postId: number,
  rootIds: Array<number>,
) {
  const counts = new Map<number, number>();
  if (rootIds.length === 0) {
    return counts;
  }

  const rows = await db
    .select({
      rootId: CommentsTable.rootId,
      value: count(),
    })
    .from(CommentsTable)
    .where(
      and(
        eq(CommentsTable.postId, postId),
        inArray(CommentsTable.rootId, rootIds),
        eq(CommentsTable.status, "published"),
      ),
    )
    .groupBy(CommentsTable.rootId);

  for (const row of rows) {
    if (row.rootId != null) {
      counts.set(row.rootId, row.value);
    }
  }
  return counts;
}

export async function getReplyCountByRootId(
  db: DB,
  postId: number,
  rootId: number,
  options: {
    status?: CommentStatus | Array<CommentStatus>;
  } = {},
) {
  const { status } = options;

  const conditions = buildCommentWhereClause({
    postId,
    rootId,
    status,
  });

  const result = await db
    .select({ count: count() })
    .from(CommentsTable)
    .where(conditions);

  return result[0].count;
}

async function withReplyToUsers<T extends { replyToCommentId: number | null }>(
  db: DB,
  replies: Array<T>,
) {
  const targetIds = [
    ...new Set(
      replies
        .map((reply) => reply.replyToCommentId)
        .filter((id): id is number => id != null),
    ),
  ];
  if (targetIds.length === 0) {
    return replies.map((reply) => ({ ...reply, replyTo: null }));
  }

  const targets = await db
    .select({
      id: CommentsTable.id,
      userId: CommentsTable.userId,
    })
    .from(CommentsTable)
    .where(inArray(CommentsTable.id, targetIds));

  const userIds = [
    ...new Set(
      targets
        .map((target) => target.userId)
        .filter((id): id is string => id != null),
    ),
  ];
  const users =
    userIds.length === 0
      ? []
      : await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(inArray(user.id, userIds));
  const userById = new Map(users.map((row) => [row.id, row]));
  const replyToByCommentId = new Map(
    targets.map((target) => [
      target.id,
      target.userId ? (userById.get(target.userId) ?? null) : null,
    ]),
  );

  return replies.map((reply) => ({
    ...reply,
    replyTo: reply.replyToCommentId
      ? (replyToByCommentId.get(reply.replyToCommentId) ?? null)
      : null,
  }));
}

export async function getRepliesByRootId(
  db: DB,
  postId: number,
  rootId: number,
  options: {
    offset?: number;
    limit?: number;
  } = {},
) {
  const { offset = 0, limit = COMMENT_PAGE_SIZE } = options;

  const replies = await db
    .select(commentListColumns)
    .from(CommentsTable)
    .leftJoin(user, eq(CommentsTable.userId, user.id))
    .where(
      and(eq(CommentsTable.postId, postId), eq(CommentsTable.rootId, rootId)),
    )
    .orderBy(CommentsTable.createdAt)
    .limit(Math.min(limit, 100))
    .offset(offset);

  return withReplyToUsers(db, replies);
}

export async function getReplyPreviewsByRootIds(
  db: DB,
  postId: number,
  rootIds: Array<number>,
) {
  const previews = new Map<
    number,
    Awaited<ReturnType<typeof getRepliesByRootId>>
  >();
  if (rootIds.length === 0) {
    return previews;
  }

  const pages = await Promise.all(
    rootIds.map(async (rootId) => ({
      rootId,
      replies: await getRepliesByRootId(db, postId, rootId, {
        limit: COMMENT_REPLY_PREVIEW_LIMIT,
      }),
    })),
  );
  for (const page of pages) {
    previews.set(page.rootId, page.replies);
  }
  return previews;
}

export async function getCommentsByUserId(
  db: DB,
  userId: string,
  options: {
    offset?: number;
    limit?: number;
    status?: CommentStatus | Array<CommentStatus>;
  } = {},
) {
  const { offset = 0, limit = COMMENT_PAGE_SIZE, status } = options;

  const conditions = buildCommentWhereClause({ userId, status });

  const comments = await db
    .select()
    .from(CommentsTable)
    .where(conditions)
    .orderBy(desc(CommentsTable.createdAt))
    .limit(Math.min(limit, 100))
    .offset(offset);

  return comments;
}

export async function updateComment(
  db: DB,
  id: number,
  data: Partial<Omit<typeof CommentsTable.$inferInsert, "id" | "createdAt">>,
) {
  const [comment] = await db
    .update(CommentsTable)
    .set(data)
    .where(eq(CommentsTable.id, id))
    .returning();
  return comment;
}

export async function getCommentAuthorWithEmail(db: DB, commentId: number) {
  const result = await db
    .select({
      userId: CommentsTable.userId,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
    })
    .from(CommentsTable)
    .leftJoin(user, eq(CommentsTable.userId, user.id))
    .where(eq(CommentsTable.id, commentId))
    .limit(1);

  if (
    result.length === 0 ||
    !result[0].userId ||
    !result[0].userName ||
    !result[0].userEmail
  ) {
    return null;
  }

  return {
    id: result[0].userId,
    name: result[0].userName,
    email: result[0].userEmail,
    role: result[0].userRole,
  };
}
