import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, updatedAt } from "./helper";
import type { SystemConfig } from "@/features/config/config.schema";

export const SystemConfigTable = sqliteTable("system_config", {
  id,
  configJson: text("config_json", { mode: "json" }).$type<SystemConfig>(),
  updatedAt,
});
