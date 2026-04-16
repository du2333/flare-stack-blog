import { sql } from "drizzle-orm";
import { integer } from "drizzle-orm/sqlite-core";

export const createdAt = integer("created_at", { mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`);

export const updatedAt = integer("updated_at", { mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`)
  .$onUpdate(() => new Date());

export const id = integer("id").primaryKey({ autoIncrement: true });
