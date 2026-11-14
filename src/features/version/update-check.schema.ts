/**
 * The update check's result and its cached form. Server only: it imports the
 * limits of `@/lib/version/upgrades`, which carries classic `zod` and the
 * build's own `upgrades.json`. Client code takes the types with `import type`.
 */
import { z } from "zod";
import {
  ApplicationReleaseVersionSchema,
  RunningApplicationReleaseVersionSchema,
} from "@/features/version/version.schema";
import {
  MAX_UPGRADE_LIST_ITEMS,
  MAX_UPGRADE_NAME_LENGTH,
  MAX_UPGRADE_TEXT_LENGTH,
  MAX_UPGRADE_VERSIONS,
} from "@/lib/version/upgrades";

// Upgrade notes come from a fetched file: plain text, bounded by the limits
// the file's reader already enforced.
const UpgradeTextSchema = z.string().max(MAX_UPGRADE_TEXT_LENGTH);
const UpgradeNameListSchema = z
  .array(z.string().max(MAX_UPGRADE_NAME_LENGTH))
  .max(MAX_UPGRADE_LIST_ITEMS);
const UpgradeItemListSchema = z
  .array(
    z.object({
      id: z.string().max(MAX_UPGRADE_NAME_LENGTH),
      text: UpgradeTextSchema,
    }),
  )
  .max(MAX_UPGRADE_LIST_ITEMS);

export const UpgradeEntrySchema = z.object({
  /** A release, `X.Y.Z` without a leading `v`. */
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/),
  summary: UpgradeTextSchema,
  before: UpgradeItemListSchema.optional(),
  after: UpgradeItemListSchema.optional(),
  requires: z
    .object({
      buildVars: UpgradeNameListSchema,
      secrets: UpgradeNameListSchema,
    })
    .optional(),
  rollback: z.enum(["safe", "unsafe"]).optional(),
});

const UpgradeEntryListSchema = z
  .array(UpgradeEntrySchema)
  .max(MAX_UPGRADE_VERSIONS);

export const UpdateCheckResultSchema = z.object({
  latestVersion: ApplicationReleaseVersionSchema,
  currentVersion: RunningApplicationReleaseVersionSchema,
  hasUpdate: z.boolean(),
  releaseUrl: z.url(),
  /** The size of the step to `latestVersion`; null without an update. */
  level: z.enum(["major", "minor", "patch"]).nullable(),
  /** The versions after the running one up to `latestVersion`, oldest first. */
  entries: UpgradeEntryListSchema,
  /** False when the answer came from the release page, which carries no notes. */
  notesAvailable: z.boolean(),
});

export type UpdateCheckResult = z.infer<typeof UpdateCheckResultSchema>;

/**
 * What the cache keeps of a fetch: the latest release and the entries newer
 * than the version that was running when it was fetched (`notesSince`). A
 * later deployment answers from it by dropping the entries it has passed.
 */
export const CachedUpdateCheckSchema = z.object({
  latestVersion: ApplicationReleaseVersionSchema,
  releaseUrl: z.url(),
  notesAvailable: z.boolean(),
  notesSince: RunningApplicationReleaseVersionSchema,
  entries: UpgradeEntryListSchema,
});

export type CachedUpdateCheck = z.infer<typeof CachedUpdateCheckSchema>;
