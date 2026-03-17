import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { SystemConfig } from "@/features/config/config.schema";
import { id, updatedAt } from "./helper";

export const SystemConfigTable = sqliteTable("system_config", {
  id,
  configJson: text("config_json", { mode: "json" }).$type<SystemConfig>(),
  updatedAt,
});
