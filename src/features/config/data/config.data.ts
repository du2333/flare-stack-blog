import { and, eq, sql } from "drizzle-orm";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  decodeStoredConfig,
  encodeStoredConfig,
} from "@/features/config/config.storage";
import { SystemConfigTable } from "@/lib/db/schema";

export async function getConfigSnapshot(db: DB) {
  const row = await db.query.SystemConfigTable.findFirst({
    where: eq(SystemConfigTable.id, 1),
  });
  return {
    config: decodeStoredConfig(row?.configJson),
    siteRevision: row?.siteRevision ?? 0,
    notificationRevision: row?.notificationRevision ?? 0,
  };
}
export async function getSystemConfig(db: DB): Promise<SystemConfig | null> {
  const row = await db.query.SystemConfigTable.findFirst({
    where: eq(SystemConfigTable.id, 1),
  });
  return row ? decodeStoredConfig(row.configJson) : null;
}
/** Internal initialization/import path; never expose as an unversioned admin write. */
export async function upsertSystemConfig(
  db: DB,
  data: SystemConfig,
): Promise<void> {
  const configJson = encodeStoredConfig(data);
  await db
    .insert(SystemConfigTable)
    .values({ id: 1, configJson, siteRevision: 1, notificationRevision: 1 })
    .onConflictDoUpdate({
      target: SystemConfigTable.id,
      set: {
        configJson,
        siteRevision: sql`${SystemConfigTable.siteRevision} + 1`,
        notificationRevision: sql`${SystemConfigTable.notificationRevision} + 1`,
      },
    });
}

/** Both predicates are checked because legacy normalization rewrites the document. */
export async function compareAndSetConfig(
  db: DB,
  current: Awaited<ReturnType<typeof getConfigSnapshot>>,
  next: SystemConfig,
  section: "site" | "notifications",
) {
  await db
    .insert(SystemConfigTable)
    .values({ id: 1, configJson: {} })
    .onConflictDoNothing();
  const rows = await db
    .update(SystemConfigTable)
    .set({
      configJson: encodeStoredConfig(next),
      siteRevision: current.siteRevision + (section === "site" ? 1 : 0),
      notificationRevision:
        current.notificationRevision + (section === "notifications" ? 1 : 0),
    })
    .where(
      and(
        eq(SystemConfigTable.id, 1),
        eq(SystemConfigTable.siteRevision, current.siteRevision),
        eq(
          SystemConfigTable.notificationRevision,
          current.notificationRevision,
        ),
      ),
    )
    .returning({ id: SystemConfigTable.id });
  return rows.length === 1;
}
