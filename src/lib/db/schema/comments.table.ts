import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth.table";
import { createdAt, id, updatedAt } from "./helper";
import { MomentsTable } from "./moments.table";
import { PostsTable } from "./posts.table";

export const COMMENT_STATUSES = ["published", "deleted"] as const;

export const CommentsTable = sqliteTable(
  "comments",
  {
    id,
    content: text(),
    rootId: integer("root_id").references(
      (): AnySQLiteColumn => CommentsTable.id,
      {
        onDelete: "cascade",
      },
    ),
    replyToCommentId: integer("reply_to_comment_id").references(
      (): AnySQLiteColumn => CommentsTable.id,
      { onDelete: "set null" },
    ),
    status: text("status", { enum: COMMENT_STATUSES })
      .notNull()
      .default("published"),

    // A Comment belongs to exactly one Post or one Moment (ADR 0037); the
    // CHECK below holds every row to one of them.
    postId: integer("post_id").references(() => PostsTable.id, {
      onDelete: "cascade",
    }),
    momentId: integer("moment_id").references(() => MomentsTable.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /**
     * When an Admin dealt with the Comment, by replying or by marking it
     * handled; it then no longer waits for a reply. Admin-only.
     */
    handledAt: integer("handled_at", { mode: "timestamp" }),

    createdAt,
    updatedAt,
  },
  (table) => [
    index("comments_post_root_created_idx").on(
      table.postId,
      table.rootId,
      table.createdAt,
    ),
    index("comments_moment_root_created_idx").on(
      table.momentId,
      table.rootId,
      table.createdAt,
    ),
    index("comments_user_created_idx").on(table.userId, table.createdAt),
    index("comments_status_created_idx").on(table.status, table.createdAt),
    index("comments_global_created_idx").on(table.createdAt),
    check(
      "comments_one_target",
      sql`(${table.postId} IS NULL) <> (${table.momentId} IS NULL)`,
    ),
  ],
);

export const EMAIL_UNSUBSCRIBE_TYPES = ["reply_notification"] as const;

export const EmailUnsubscriptionsTable = sqliteTable(
  "email_unsubscriptions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: EMAIL_UNSUBSCRIBE_TYPES }).notNull(),
    createdAt,
  },
  (table) => [primaryKey({ columns: [table.userId, table.type] })],
);

// ==================== types ====================
export type Comment = typeof CommentsTable.$inferSelect;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];
export type EmailUnsubscription = typeof EmailUnsubscriptionsTable.$inferSelect;
export type EmailUnsubscribeType = (typeof EMAIL_UNSUBSCRIBE_TYPES)[number];
