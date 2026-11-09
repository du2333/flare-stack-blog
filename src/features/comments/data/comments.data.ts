import {
  and,
  count,
  desc,
  eq,
  exists,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import {
  COMMENT_PAGE_SIZE,
  COMMENT_REPLY_PREVIEW_LIMIT,
} from "@/features/comments/comment-thread";
import type { CommentTarget } from "@/features/comments/comment-target";
import {
  buildCommentWhereClause,
  targetCondition,
} from "@/features/comments/data/helper";
import type { CommentStatus } from "@/lib/db/schema";
import { CommentsTable, MomentsTable, PostsTable, user } from "@/lib/db/schema";

const commentListColumns = {
  id: CommentsTable.id,
  content: CommentsTable.content,
  rootId: CommentsTable.rootId,
  replyToCommentId: CommentsTable.replyToCommentId,
  postId: CommentsTable.postId,
  momentId: CommentsTable.momentId,
  userId: CommentsTable.userId,
  status: CommentsTable.status,
  createdAt: CommentsTable.createdAt,
  updatedAt: CommentsTable.updatedAt,
  user: {
    id: user.id,
    name: user.name,
    image: user.image,
    role: user.role,
    mutedAt: user.mutedAt,
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

function visibleRootCondition(db: DB, target: CommentTarget) {
  const threadReplies = alias(CommentsTable, "thread_replies");
  return and(
    targetCondition(target),
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

export async function getRootComments(
  db: DB,
  target: CommentTarget,
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
    .where(visibleRootCondition(db, target))
    .orderBy(desc(CommentsTable.createdAt))
    .limit(Math.min(limit, 100))
    .offset(offset);

  return comments;
}

export async function getVisibleRootById(
  db: DB,
  target: CommentTarget,
  rootId: number,
) {
  const comments = await db
    .select(commentListColumns)
    .from(CommentsTable)
    .leftJoin(user, eq(CommentsTable.userId, user.id))
    .where(and(visibleRootCondition(db, target), eq(CommentsTable.id, rootId)))
    .limit(1);

  return comments[0] ?? null;
}

export async function getPublishedCommentsCount(db: DB, target: CommentTarget) {
  const result = await db
    .select({ count: count() })
    .from(CommentsTable)
    .where(and(targetCondition(target), eq(CommentsTable.status, "published")));

  return result[0].count;
}

export async function getPublishedReplyCountsByRootIds(
  db: DB,
  target: CommentTarget,
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
        targetCondition(target),
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
  target: CommentTarget,
  rootId: number,
  options: {
    status?: CommentStatus | Array<CommentStatus>;
  } = {},
) {
  const { status } = options;

  const conditions = buildCommentWhereClause({
    target,
    rootId,
    status,
  });

  const result = await db
    .select({ count: count() })
    .from(CommentsTable)
    .where(conditions);

  return result[0].count;
}

/** A reply also carries who it answers, resolved in the same query. */
const replyToComment = alias(CommentsTable, "reply_to_comment");
const replyToUser = alias(user, "reply_to_user");
const replyListColumns = {
  ...commentListColumns,
  replyTo: { id: replyToUser.id, name: replyToUser.name },
};

function selectReplies(db: DB) {
  return db
    .select(replyListColumns)
    .from(CommentsTable)
    .leftJoin(user, eq(CommentsTable.userId, user.id))
    .leftJoin(
      replyToComment,
      eq(CommentsTable.replyToCommentId, replyToComment.id),
    )
    .leftJoin(replyToUser, eq(replyToComment.userId, replyToUser.id));
}

export async function getRepliesByRootId(
  db: DB,
  target: CommentTarget,
  rootId: number,
  options: {
    offset?: number;
    limit?: number;
  } = {},
) {
  const { offset = 0, limit = COMMENT_PAGE_SIZE } = options;

  return await selectReplies(db)
    .where(and(targetCondition(target), eq(CommentsTable.rootId, rootId)))
    .orderBy(CommentsTable.createdAt, CommentsTable.id)
    .limit(Math.min(limit, 100))
    .offset(offset);
}

/** The first replies of every given root in one query, not one per root. */
export async function getReplyPreviewsByRootIds(
  db: DB,
  target: CommentTarget,
  rootIds: Array<number>,
) {
  const previews = new Map<
    number,
    Awaited<ReturnType<typeof getRepliesByRootId>>
  >();
  if (rootIds.length === 0) {
    return previews;
  }

  const ranked = db
    .select({
      id: CommentsTable.id,
      position:
        sql<number>`row_number() over (partition by ${CommentsTable.rootId} order by ${CommentsTable.createdAt}, ${CommentsTable.id})`.as(
          "position",
        ),
    })
    .from(CommentsTable)
    .where(and(targetCondition(target), inArray(CommentsTable.rootId, rootIds)))
    .as("ranked_replies");

  const rows = await selectReplies(db)
    .innerJoin(ranked, eq(CommentsTable.id, ranked.id))
    .where(lte(ranked.position, COMMENT_REPLY_PREVIEW_LIMIT))
    .orderBy(CommentsTable.createdAt, CommentsTable.id);

  for (const row of rows) {
    if (row.rootId == null) {
      continue;
    }
    const replies = previews.get(row.rootId);
    if (replies) {
      replies.push(row);
    } else {
      previews.set(row.rootId, [row]);
    }
  }
  return previews;
}

/**
 * A User's own Comments, newest first, each with what names its page: the
 * Post's public slug (null while the Post is not public), or the Moment's
 * text and whether it has a video, from which its heading is made.
 */
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
    .select({
      comment: CommentsTable,
      postSlug: PostsTable.publicSlug,
      momentText: MomentsTable.text,
      momentHasVideo: sql<number>`${MomentsTable.video} IS NOT NULL`.mapWith(
        Boolean,
      ),
    })
    .from(CommentsTable)
    .leftJoin(PostsTable, eq(CommentsTable.postId, PostsTable.id))
    .leftJoin(MomentsTable, eq(CommentsTable.momentId, MomentsTable.id))
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

/** Handling a Comment is bookkeeping, not an edit: `updated_at` stays. */
export const keepUpdatedAt = { updatedAt: sql`${CommentsTable.updatedAt}` };

/** Sets when an Admin handled a Comment; null puts it back in the queue. */
export async function setCommentHandledAt(
  db: DB,
  id: number,
  handledAt: Date | null,
) {
  const [comment] = await db
    .update(CommentsTable)
    .set({ handledAt, ...keepUpdatedAt })
    .where(eq(CommentsTable.id, id))
    .returning({ id: CommentsTable.id });
  return comment ?? null;
}

/** Marks a Comment handled unless it already is, keeping the first time. */
export async function markCommentHandledOnce(
  db: DB,
  id: number,
  handledAt: Date,
) {
  await db
    .update(CommentsTable)
    .set({ handledAt, ...keepUpdatedAt })
    .where(and(eq(CommentsTable.id, id), isNull(CommentsTable.handledAt)));
}
