import {
  and,
  count,
  desc,
  eq,
  exists,
  isNotNull,
  max,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { AdminCommentView } from "@/features/comments/comments.schema";
import {
  adminAnswers,
  unrepliedVisitorComment,
} from "@/features/dashboard/data/dashboard.data";
import { containsText } from "@/lib/db/text-match";
import { CommentsTable, MomentsTable, PostsTable, user } from "@/lib/db/schema";

export interface AdminCommentsFilter {
  view: AdminCommentView;
  search?: string;
  postId?: number;
}

const ReplyToComment = alias(CommentsTable, "reply_to_comment");
const ReplyToUser = alias(user, "reply_to_user");

/** A Post's title as readers know it: its Public Content Snapshot's, else its draft's. */
const postTitle = sql<string>`coalesce(json_extract(${PostsTable.publicSnapshotJson}, '$.title'), ${PostsTable.title})`;

const postIsPublic = and(
  isNotNull(PostsTable.publicSnapshotJson),
  isNotNull(PostsTable.publicSlug),
);

/**
 * The published Comments the view, search and filter match. The query left
 * joins the Comment's Post, Moment and author, as the unreplied condition
 * needs.
 */
function matching(db: DB, filter: AdminCommentsFilter) {
  const search = filter.search?.trim();
  return and(
    eq(CommentsTable.status, "published"),
    filter.view === "unreplied" ? unrepliedVisitorComment(db) : undefined,
    search
      ? or(
          containsText(user.name, search),
          containsText(CommentsTable.content, search),
        )
      : undefined,
    filter.postId === undefined
      ? undefined
      : eq(CommentsTable.postId, filter.postId),
  );
}

/** Matching Comments, newest first, a page at a time. */
export async function listAdminComments(
  db: DB,
  filter: AdminCommentsFilter,
  page: { offset: number; limit: number },
) {
  const awaitingReply = unrepliedVisitorComment(db);
  return db
    .select({
      id: CommentsTable.id,
      content: CommentsTable.content,
      postId: CommentsTable.postId,
      momentId: CommentsTable.momentId,
      rootId: CommentsTable.rootId,
      replyToCommentId: CommentsTable.replyToCommentId,
      createdAt: CommentsTable.createdAt,
      userId: CommentsTable.userId,
      userName: user.name,
      userImage: user.image,
      userRole: user.role,
      userMutedAt: user.mutedAt,
      replyToName: ReplyToUser.name,
      postTitle,
      postSlug: sql<
        string | null
      >`case when ${postIsPublic} then ${PostsTable.publicSlug} end`,
      momentText: MomentsTable.text,
      momentHasVideo: sql<number>`${MomentsTable.video} IS NOT NULL`.mapWith(
        Boolean,
      ),
      handled: sql<number>`${CommentsTable.handledAt} IS NOT NULL`.mapWith(
        Boolean,
      ),
      answered: sql<number>`${exists(adminAnswers(db))}`.mapWith(Boolean),
      awaitingReply:
        sql<number>`case when ${awaitingReply} then 1 else 0 end`.mapWith(
          Boolean,
        ),
    })
    .from(CommentsTable)
    .leftJoin(PostsTable, eq(CommentsTable.postId, PostsTable.id))
    .leftJoin(MomentsTable, eq(CommentsTable.momentId, MomentsTable.id))
    .leftJoin(user, eq(CommentsTable.userId, user.id))
    .leftJoin(
      ReplyToComment,
      eq(CommentsTable.replyToCommentId, ReplyToComment.id),
    )
    .leftJoin(ReplyToUser, eq(ReplyToComment.userId, ReplyToUser.id))
    .where(matching(db, filter))
    .orderBy(desc(CommentsTable.createdAt), desc(CommentsTable.id))
    .limit(page.limit)
    .offset(page.offset);
}

export async function countAdminComments(db: DB, filter: AdminCommentsFilter) {
  const [row] = await db
    .select({ total: count() })
    .from(CommentsTable)
    .leftJoin(PostsTable, eq(CommentsTable.postId, PostsTable.id))
    .leftJoin(MomentsTable, eq(CommentsTable.momentId, MomentsTable.id))
    .leftJoin(user, eq(CommentsTable.userId, user.id))
    .where(matching(db, filter));
  return row?.total ?? 0;
}

/** Posts with published Comments, the most recently commented first. */
export async function listCommentedPosts(db: DB) {
  return db
    .select({ id: PostsTable.id, title: postTitle, comments: count() })
    .from(CommentsTable)
    .innerJoin(PostsTable, eq(CommentsTable.postId, PostsTable.id))
    .where(eq(CommentsTable.status, "published"))
    .groupBy(PostsTable.id)
    .orderBy(desc(max(CommentsTable.createdAt)), desc(PostsTable.id));
}

export async function postExists(db: DB, id: number) {
  const [row] = await db
    .select({ id: PostsTable.id })
    .from(PostsTable)
    .where(eq(PostsTable.id, id))
    .limit(1);
  return row !== undefined;
}
