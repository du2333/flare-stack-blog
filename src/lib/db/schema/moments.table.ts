import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { id, updatedAt } from "./helper";
import { MediaTable } from "./media.table";
import { newSaveToken } from "./posts.table";

/**
 * A Moment's video, with every attribute a Post body's video block has
 * (`schemaVideo`), so the public page and feeds show both the same way: a
 * Bilibili or YouTube video by its provider and video ID with the title,
 * cover and length looked up when it was posted, or a Direct Video
 * (`provider: "direct"`) by its file `src`, page `pageUrl`, poster `cover`
 * and title.
 */
export type MomentVideo = {
  provider: "bilibili" | "youtube" | "direct";
  videoId: string | null;
  page: number | null;
  start: number | null;
  title: string | null;
  cover: string | null;
  duration: number | null;
  src: string | null;
  pageUrl: string | null;
};

/**
 * Moments are not Posts (ADR 0037): no title, slug, draft or snapshot. What a
 * reader sees is the row itself, so every write is public at once.
 */
export const MomentsTable = sqliteTable(
  "moments",
  {
    id,
    // Empty when the Moment is only images or a video.
    text: text().notNull().default(""),
    video: text("video", { mode: "json" }).$type<MomentVideo>(),
    // Replaced by every write so a save can refuse an Edit Conflict, as a
    // Post's is (ADR 0031). Writes set it themselves so the image rows
    // written in the same batch can find the row by it.
    saveToken: text("save_token").notNull().$defaultFn(newSaveToken),
    // When it was first posted; edits never change it.
    postedAt: integer("posted_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt,
  },
  (table) => [index("moments_posted_at_idx").on(table.postedAt, table.id)],
);

/**
 * A Moment's images, in order. Each is Media, so the Media cannot be deleted
 * while a Moment shows it (`media.data.ts` reads this table).
 */
export const MomentImagesTable = sqliteTable(
  "moment_images",
  {
    momentId: integer("moment_id")
      .notNull()
      .references(() => MomentsTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    mediaId: integer("media_id")
      .notNull()
      .references(() => MediaTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.momentId, table.position] }),
    index("moment_images_media_idx").on(table.mediaId),
  ],
);

export type Moment = typeof MomentsTable.$inferSelect;
