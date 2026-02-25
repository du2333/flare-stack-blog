import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./helper";
import { MediaTable } from "./media.table";
import { user } from "./auth.table";

export const GUITAR_TAB_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export const GuitarTabMetadataTable = sqliteTable("guitar_tab_metadata", {
  id,
  /** 关联的 GP 文件 media ID */
  mediaId: integer("media_id")
    .notNull()
    .unique()
    .references(() => MediaTable.id, { onDelete: "cascade" }),
  /** 曲名 */
  title: text().notNull().default(""),
  /** 艺术家 */
  artist: text().notNull().default(""),
  /** 专辑 */
  album: text().notNull().default(""),
  /** 速度 BPM */
  tempo: integer().notNull().default(120),
  /** 轨道数 */
  trackCount: integer("track_count").notNull().default(0),
  /** 轨道名称（JSON 数组字符串） */
  trackNames: text("track_names").notNull().default("[]"),
  /** 关联的专辑封面 media ID */
  coverMediaId: integer("cover_media_id").references(() => MediaTable.id, {
    onDelete: "set null",
  }),
  /** 文件内容哈希（SHA-256）用于去重 */
  fileHash: text("file_hash"),
  /** URL 友好的唯一标识（自动生成） */
  slug: text("slug").unique(),
  /** 上传者用户 ID（管理员上传时可为 null） */
  uploaderId: text("uploader_id").references(() => user.id, {
    onDelete: "set null",
  }),
  /** 审核状态 */
  status: text("status", { enum: GUITAR_TAB_STATUSES })
    .notNull()
    .default("approved"),
  createdAt,
  updatedAt,
});

export type GuitarTabMetadata = typeof GuitarTabMetadataTable.$inferSelect;
export type InsertGuitarTabMetadata =
  typeof GuitarTabMetadataTable.$inferInsert;
export type GuitarTabStatus = (typeof GUITAR_TAB_STATUSES)[number];
