/**
 * The notice shown after an upgrade (spec #318, section 4) and where the
 * acknowledged version is kept. Server only: it imports the limits of
 * `@/lib/version/upgrades`, which carries classic `zod` and the build's own
 * `upgrades.json`. Client code takes the types with `import type`.
 */
import { z } from "zod";
import {
  MAX_UPGRADE_LIST_ITEMS,
  MAX_UPGRADE_NAME_LENGTH,
  MAX_UPGRADE_TEXT_LENGTH,
  MAX_UPGRADE_VERSIONS,
} from "@/lib/version/upgrades";

/** The one KV key: the last version an Admin acknowledged. No expiry. */
export const ACKNOWLEDGED_VERSION_KEY = [
  "version",
  "acknowledged-upgrade",
] as const;

export const UpgradeNoticeEntrySchema = z.object({
  /** A release, `X.Y.Z` without a leading `v`. */
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/),
  summary: z.string().max(MAX_UPGRADE_TEXT_LENGTH),
  /** What remains to be done once this version runs; absent when nothing. */
  after: z
    .array(
      z.object({
        id: z.string().max(MAX_UPGRADE_NAME_LENGTH),
        text: z.string().max(MAX_UPGRADE_TEXT_LENGTH),
      }),
    )
    .max(MAX_UPGRADE_LIST_ITEMS)
    .optional(),
});

export const UpgradeNoticeSchema = z.object({
  /** The running version; it may be a prerelease. */
  version: z.string(),
  /** The versions after the acknowledged one up to the running one, oldest first. */
  entries: z.array(UpgradeNoticeEntrySchema).max(MAX_UPGRADE_VERSIONS),
});

export const UpgradeNoticeResultSchema = z.object({
  /** Null when there is nothing to show. */
  notice: UpgradeNoticeSchema.nullable(),
});

export type UpgradeNoticeEntry = z.infer<typeof UpgradeNoticeEntrySchema>;
export type UpgradeNotice = z.infer<typeof UpgradeNoticeSchema>;
export type UpgradeNoticeResult = z.infer<typeof UpgradeNoticeResultSchema>;
