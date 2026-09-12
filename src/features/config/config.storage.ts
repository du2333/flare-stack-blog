import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { resolveSystemConfig } from "./config.resolve";
import { SystemConfigSchema, type SystemConfig } from "./config.schema";

export const CONFIG_SCHEMA_VERSION = 1;
export type StoredSystemConfig = SystemConfig & { schemaVersion?: number };

/** Version 0 includes SMTP apiKey, social objects and webhook arrays. */
export function decodeStoredConfig(value: unknown): SystemConfig {
  const raw = z
    .object({ schemaVersion: z.number().int().nonnegative().optional() })
    .passthrough()
    .parse(value ?? {});
  if ((raw.schemaVersion ?? 0) > CONFIG_SCHEMA_VERSION)
    throw new ORPCError("CONFIG_VERSION_UNSUPPORTED", { status: 409 });
  const { schemaVersion: _, ...config } = raw;
  // Legacy normalization must precede current validation (notably social links).
  return SystemConfigSchema.parse(resolveSystemConfig(config as SystemConfig));
}

export function encodeStoredConfig(value: SystemConfig): StoredSystemConfig {
  return { ...decodeStoredConfig(value), schemaVersion: CONFIG_SCHEMA_VERSION };
}
