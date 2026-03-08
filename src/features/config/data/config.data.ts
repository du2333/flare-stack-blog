import { eq } from "drizzle-orm";
import type { SystemConfig } from "@/features/config/config.schema";
import { SystemConfigTable } from "@/lib/db/schema";

export async function getSystemConfig(db: DB): Promise<SystemConfig | null> {
  const row = await db.query.SystemConfigTable.findFirst();
  return row?.configJson ?? null;
}

export async function upsertSystemConfig(
  db: DB,
  data: SystemConfig,
): Promise<void> {
  const existing = await db.query.SystemConfigTable.findFirst();

  if (existing) {
    await db
      .update(SystemConfigTable)
      .set({ configJson: data })
      .where(eq(SystemConfigTable.id, existing.id));
  } else {
    await db.insert(SystemConfigTable).values({ configJson: data });
  }
}
