import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./helper";
import { user } from "./auth.table";
import { PostsTable } from "./posts.table";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { JSONContent } from "@tiptap/react";

export const COMMENT_STATUSES = [
  "pending",
  "published",
  "deleted",
  "verifying",
] as const;

export const CommentsTable = sqliteTable(
  "comments",
  {
    id,
    content: text({ mode: "json" }).$type<JSONContent>(),
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
      .default("verifying"),
    aiReason: text("ai_reason"),

    postId: integer("post_id")
      .notNull()
      .references(() => PostsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),

    createdAt,
    updatedAt,
  },
  (table) => [
    index("comments_post_root_created_idx").on(
      table.postId,
      table.rootId,
      table.createdAt,
    ),
    index("comments_user_created_idx").on(table.userId, table.createdAt),
    index("comments_status_created_idx").on(table.status, table.createdAt),
    index("comments_global_created_idx").on(table.createdAt),
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
