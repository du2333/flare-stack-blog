import type { JSONContent } from "@tiptap/react";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./helper";

export const POST_STATUSES = ["draft", "published"] as const;

export type PublicPostCover = {
  mediaId: number;
  key: string;
  url: string;
  width: number | null;
  height: number | null;
};

export type PublicPostSnapshot = {
  title: string;
  summary: string | null;
  slug: string;
  contentJson: JSONContent | null;
  tagIds: Array<number>;
  publishedAt: string;
  pinnedAt: string | null;
  cover: PublicPostCover | null;
};

export const PostsTable = sqliteTable(
  "posts",
  {
    id,
    title: text().notNull(),
    summary: text(),
    slug: text().notNull().unique(),

    contentJson: text("content_json", { mode: "json" }).$type<JSONContent>(),
    publicSnapshotJson: text("public_snapshot_json", {
      mode: "json",
    }).$type<PublicPostSnapshot>(),
    publicSlug: text("public_slug"),
    status: text("status", { enum: POST_STATUSES }).notNull().default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    pinnedAt: integer("pinned_at", { mode: "timestamp" }),
    coverMediaId: integer("cover_media_id"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("posts_public_slug_unique").on(table.publicSlug),
    index("published_at_idx").on(table.publishedAt, table.status),
    index("created_at_idx").on(table.createdAt),
    index("posts_cover_media_id_idx").on(table.coverMediaId),
  ],
);

export const TagsTable = sqliteTable("tags", {
  id,
  name: text().notNull().unique(),
  createdAt,
});

export const PostTagsTable = sqliteTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => PostsTable.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => TagsTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index("post_tags_tag_idx").on(table.tagId),
  ],
);

// ==================== relations ====================
export const postsRelations = relations(PostsTable, ({ many }) => ({
  postTags: many(PostTagsTable),
}));

export const tagsRelations = relations(TagsTable, ({ many }) => ({
  postTags: many(PostTagsTable),
}));

export const postTagsRelations = relations(PostTagsTable, ({ one }) => ({
  post: one(PostsTable, {
    fields: [PostTagsTable.postId],
    references: [PostsTable.id],
  }),
  tag: one(TagsTable, {
    fields: [PostTagsTable.tagId],
    references: [TagsTable.id],
  }),
}));

// ==================== types ====================
export type Tag = typeof TagsTable.$inferSelect;
export type Post = typeof PostsTable.$inferSelect;
export type PostStatus = (typeof POST_STATUSES)[number];
