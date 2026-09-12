import { upsertSystemConfig } from "@/features/config/data/config.data";
import { invalidate } from "@/features/cache/public-cache";
import type { SystemConfig } from "@/features/config/config.schema";

/** Seed runtime/legacy scenarios without pretending to be an admin PATCH caller. */
export async function seedSystemConfig(
  context: DbContext & { executionCtx: ExecutionContext },
  value: SystemConfig,
) {
  await upsertSystemConfig(context.db, value);
  await invalidate.siteConfigChanged(context);
}
