import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./helper";
import { user } from "./auth.table";

export const FRIEND_LINK_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export const FriendLinksTable = sqliteTable(
  "friend_links",
  {
    id,
    siteName: text("site_name").notNull(),
    siteUrl: text("site_url").notNull(),
    description: text(),
    logoUrl: text("logo_url"),
    contactEmail: text("contact_email"),
    status: text("status", { enum: FRIEND_LINK_STATUSES })
      .notNull()
      .default("pending"),
    rejectionReason: text("rejection_reason"),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("friend_links_status_created_idx").on(table.status, table.createdAt),
    index("friend_links_user_idx").on(table.userId),
  ],
);

// ==================== types ====================
export type FriendLink = typeof FriendLinksTable.$inferSelect;
export type FriendLinkStatus = (typeof FRIEND_LINK_STATUSES)[number];
