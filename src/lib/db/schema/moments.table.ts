import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./helper";

export const MOMENT_TYPES = ["moment", "chatter"] as const;

export const MomentsTable = sqliteTable(
  "moments",
  {
    id,
    type: text("type", { enum: MOMENT_TYPES }).notNull().default("moment"),
    content: text("content").notNull(),
    images: text("images", { mode: "json" })
      .$type<Array<string>>()
      .notNull()
      .default(sql`'[]'`),
    location: text("location"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt,
    updatedAt,
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_moments_published").on(table.publishedAt),
    index("idx_moments_type").on(table.type),
  ],
);

export type Moment = typeof MomentsTable.$inferSelect;
export type MomentType = (typeof MOMENT_TYPES)[number];
