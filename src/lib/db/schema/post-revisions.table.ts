import type { JSONContent } from "@tiptap/react";
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, id } from "./helper";
import type { PostStatus } from "./posts.table";
import { PostsTable } from "./posts.table";

export const POST_REVISION_REASONS = [
  "auto",
  "publish",
  "restore_backup",
] as const;

export interface PostRevisionSnapshot {
  title: string;
  summary: string | null;
  slug: string;
  status: PostStatus;
  publishedAt: string | null;
  readTimeInMinutes: number;
  contentJson: JSONContent | null;
  tagIds: Array<number>;
}

export const PostRevisionsTable = sqliteTable(
  "post_revisions",
  {
    id,
    postId: integer("post_id")
      .notNull()
      .references(() => PostsTable.id, { onDelete: "cascade" }),
    reason: text("reason", { enum: POST_REVISION_REASONS })
      .notNull()
      .default("auto"),
    snapshotJson: text("snapshot_json", { mode: "json" })
      .$type<PostRevisionSnapshot>()
      .notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    restoredFromRevisionId: integer("restored_from_revision_id"),
    createdAt,
  },
  (table) => [
    index("post_revisions_post_created_idx").on(table.postId, table.createdAt),
    index("post_revisions_post_hash_idx").on(table.postId, table.snapshotHash),
  ],
);

export const postRevisionRelations = relations(
  PostRevisionsTable,
  ({ one }) => ({
    post: one(PostsTable, {
      fields: [PostRevisionsTable.postId],
      references: [PostsTable.id],
    }),
  }),
);

export type PostRevision = typeof PostRevisionsTable.$inferSelect;
export type PostRevisionReason = (typeof POST_REVISION_REASONS)[number];
