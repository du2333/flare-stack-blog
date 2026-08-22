import { defineEntry } from "@/features/cache/public-cache";
import { SystemConfigSchema } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import { resolveSystemConfig } from "@/features/config/config.resolve";

export const systemConfig = defineEntry({
  name: "config.system",
  key: (_params: Record<string, never>) => ["system"],
  schema: SystemConfigSchema,
  ttl: "1h",
  invalidatedBy: ["site-config.changed"],
  load: async (context) =>
    resolveSystemConfig(await ConfigRepo.getSystemConfig(context.db)),
  hydrate: resolveSystemConfig,
});
