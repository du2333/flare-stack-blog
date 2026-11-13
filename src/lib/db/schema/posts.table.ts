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
import { POST_STATUSES } from "../../enum-values";
import { createdAt, id, updatedAt } from "./helper";

export { POST_STATUSES };

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
  // Written with the public assignments below (ADR 0033); public reads, filters
  // and counts use those relations rather than these ids.
  tagIds: Array<number>;
  categoryId: number | null;
  publishedAt: string;
  // When publishing last wrote this snapshot, ISO 8601: the sitemap's lastmod,
  // since the draft's updatedAt would show edits nobody has published. Absent
  // from snapshots written before it existed, which fall back to publishedAt.
  lastPublishedAt?: string;
  // Snapshots written before pinning left the snapshot may still carry a
  // pinnedAt; nothing reads it.
  cover: PublicPostCover | null;
};

export function newSaveToken() {
  return crypto.randomUUID();
}

// A name's or slug's key, uniqueKeyOf (src/lib/unicode-text), is what
// uniqueness compares: case and NFKC forms aside. Each write of the value
// writes it. Null means not computed yet (migration 0029); the app computes it
// before its next uniqueness check. A key ending in U+0001 and the row's id is
// parked: the row was a duplicate before keys existed and keeps its value,
// which no other row can take (unique-keys.data.ts).
export const CategoriesTable = sqliteTable(
  "categories",
  {
    id,
    name: text().notNull().unique(),
    nameKey: text("name_key"),
    createdAt,
  },
  (table) => [uniqueIndex("categories_name_key_unique").on(table.nameKey)],
);

export const PostsTable = sqliteTable(
  "posts",
  {
    id,
    title: text().notNull(),
    summary: text(),
    slug: text().notNull().unique(),
    slugKey: text("slug_key"),

    contentJson: text("content_json", { mode: "json" }).$type<JSONContent>(),
    publicSnapshotJson: text("public_snapshot_json", {
      mode: "json",
    }).$type<PublicPostSnapshot>(),
    publicSlug: text("public_slug"),
    publicSlugKey: text("public_slug_key"),
    status: text("status", { enum: POST_STATUSES }).notNull().default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    pinnedAt: integer("pinned_at", { mode: "timestamp" }),
    coverMediaId: integer("cover_media_id"),
    categoryId: integer("category_id").references(() => CategoriesTable.id, {
      onDelete: "set null",
    }),
    // The Category the Public Content Snapshot assigns, written with it on
    // publish and cleared on unpublish (ADR 0033).
    publicCategoryId: integer("public_category_id").references(
      () => CategoriesTable.id,
      { onDelete: "set null" },
    ),
    // Opaque, replaced by every write to the row so a save can refuse an
    // Edit Conflict (ADR 0031). $onUpdate covers every Drizzle update;
    // pinning keeps it, since the pin is not part of the draft.
    saveToken: text("save_token")
      .notNull()
      .$defaultFn(newSaveToken)
      .$onUpdate(newSaveToken),
    // Fingerprints of the draft and of the draft as last published, over the
    // fields that go live (title, summary, slug, content, publication date,
    // cover, Category, Tags; not pin). They differ exactly while the Post has
    // Unpublished Changes. Publishing writes both with the snapshot. Every
    // other write that can change those fields clears `draftFingerprint`, and
    // null (either column) means "compute me": the next Admin read settles it.
    draftFingerprint: text("draft_fingerprint"),
    publishedFingerprint: text("published_fingerprint"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("posts_public_slug_unique").on(table.publicSlug),
    uniqueIndex("posts_slug_key_unique").on(table.slugKey),
    uniqueIndex("posts_public_slug_key_unique").on(table.publicSlugKey),
    index("published_at_idx").on(table.publishedAt, table.status),
    index("created_at_idx").on(table.createdAt),
    index("posts_cover_media_id_idx").on(table.coverMediaId),
    index("posts_category_id_idx").on(table.categoryId),
    index("posts_public_category_id_idx").on(table.publicCategoryId),
  ],
);

export const TagsTable = sqliteTable(
  "tags",
  {
    id,
    name: text().notNull().unique(),
    nameKey: text("name_key"),
    createdAt,
  },
  (table) => [uniqueIndex("tags_name_key_unique").on(table.nameKey)],
);

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

/**
 * The Tags the Public Content Snapshot assigns, written with it on publish and
 * cleared on unpublish (ADR 0033). `post_tags` holds the draft's.
 */
export const PostPublicTagsTable = sqliteTable(
  "post_public_tags",
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
    index("post_public_tags_tag_idx").on(table.tagId),
  ],
);

// ==================== relations ====================
export const postsRelations = relations(PostsTable, ({ many, one }) => ({
  postTags: many(PostTagsTable),
  category: one(CategoriesTable, {
    fields: [PostsTable.categoryId],
    references: [CategoriesTable.id],
  }),
}));

export const categoriesRelations = relations(CategoriesTable, ({ many }) => ({
  posts: many(PostsTable),
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
// Unique keys are the database's to compare by, not part of what is read.
export type Tag = Omit<typeof TagsTable.$inferSelect, "nameKey">;
export type Category = Omit<typeof CategoriesTable.$inferSelect, "nameKey">;
export type Post = Omit<
  typeof PostsTable.$inferSelect,
  "slugKey" | "publicSlugKey"
>;
export type PostStatus = (typeof POST_STATUSES)[number];
