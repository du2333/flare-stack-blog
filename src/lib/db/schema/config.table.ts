import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { StoredSystemConfig } from "@/features/config/config.storage";
import { updatedAt } from "./helper";

export const SystemConfigTable = sqliteTable(
  "system_config",
  {
    id: integer("id").primaryKey().notNull().default(1),
    configJson: text("config_json", { mode: "json" })
      .$type<StoredSystemConfig>()
      .notNull(),
    siteRevision: integer("site_revision").notNull().default(0),
    notificationRevision: integer("notification_revision").notNull().default(0),
    updatedAt,
  },
  (table) => [
    check("system_config_singleton", sql`${table.id} = 1`),
    check("system_config_valid_json", sql`json_valid(${table.configJson})`),
    check(
      "system_config_revisions",
      sql`${table.siteRevision} >= 0 AND ${table.notificationRevision} >= 0`,
    ),
  ],
);
