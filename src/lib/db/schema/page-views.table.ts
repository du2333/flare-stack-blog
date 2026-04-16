import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, id } from "./helper";
import { PostsTable } from "./posts.table";

export const PageViewsTable = sqliteTable(
  "page_views",
  {
    id,
    postId: integer("post_id")
      .notNull()
      .references(() => PostsTable.id, { onDelete: "cascade" }),
    visitorHash: text("visitor_hash").notNull(),
    createdAt,
  },
  (table) => [
    index("idx_pv_post_created").on(table.postId, table.createdAt),
    index("idx_pv_created").on(table.createdAt),
  ],
);
