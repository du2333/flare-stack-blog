import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const SearchDocumentsTable = sqliteTable("search_documents", {
  postId: integer("post_id").primaryKey(),
  slug: text().notNull(),
  title: text().notNull(),
  summary: text().notNull(),
  content: text().notNull(),
  tags: text({ mode: "json" }).$type<string[]>().notNull(),
  tokens: text().notNull(),
});

export const SearchIndexMetaTable = sqliteTable("search_index_meta", {
  id: integer().primaryKey(),
  version: text().notNull(),
});
