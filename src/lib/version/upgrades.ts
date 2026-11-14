/**
 * Upgrade notes: the shape of `upgrades.json`, its validation, and the
 * questions the readers ask of it (spec #318, section 2).
 *
 * The file lists every released version, newest first, with what a site owner
 * has to do around the upgrade. `unreleased` collects the notes of the next
 * release while it is being built; the release check (scripts/release-check.ts)
 * stamps it with the version and moves it into `versions`, so the file on
 * `main` has no `unreleased`. A release's level (major, minor, patch) comes
 * from the version numbers and is stored nowhere.
 *
 * A file fetched from elsewhere is untrusted: the schema bounds every list and
 * every text, refuses unknown keys, and refuses the whole file rather than
 * dropping a part of it. Readers show the texts as plain text.
 *
 * Relative imports only, so `bun` scripts load this module as the Worker does.
 */
import { z } from "zod";
import upgradesJson from "../../../upgrades.json";
import {
  compareAppVersions,
  formatAppVersion,
  parseAppVersion,
} from "./app-version";

/** Released versions the file may list. */
export const MAX_UPGRADE_VERSIONS = 1000;
/** Items in one `before` or `after` list, and names in one `requires` list. */
export const MAX_UPGRADE_LIST_ITEMS = 20;
/** Characters in a `summary` or an item's `text`. */
export const MAX_UPGRADE_TEXT_LENGTH = 500;
/** Characters in an item's `id` or a configuration name. */
export const MAX_UPGRADE_NAME_LENGTH = 64;

const text = z.string().trim().min(1).max(MAX_UPGRADE_TEXT_LENGTH);

const UpgradeItemSchema = z.strictObject({
  /** Stable within the entry, e.g. `secrets-as-secret`. */
  id: z
    .string()
    .max(MAX_UPGRADE_NAME_LENGTH)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  text,
});

const itemList = z
  .array(UpgradeItemSchema)
  .max(MAX_UPGRADE_LIST_ITEMS)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    {
      message: "Item ids repeat within the list",
    },
  );

const nameList = z
  .array(
    z
      .string()
      .max(MAX_UPGRADE_NAME_LENGTH)
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  )
  .max(MAX_UPGRADE_LIST_ITEMS);

const entryFields = {
  /** One sentence for the release as a whole. */
  summary: text,
  /** What has to be done before syncing to this version. */
  before: itemList.optional(),
  /** What has to be done once this version runs. */
  after: itemList.optional(),
  /** Configuration this version needs before it deploys. */
  requires: z
    .strictObject({ buildVars: nameList, secrets: nameList })
    .optional(),
  /** Whether the previous version's code still runs on this version's data. */
  rollback: z.enum(["safe", "unsafe"]).optional(),
};

const UnreleasedEntrySchema = z.strictObject(entryFields);

const releasedVersion = z.string().refine(
  (value) => {
    const parsed = parseAppVersion(value);
    // A release, written without a leading `v`; prereleases are not listed.
    return (
      parsed !== null &&
      parsed.prerelease.length === 0 &&
      formatAppVersion(parsed) === value
    );
  },
  { message: "Not a release version in the form X.Y.Z" },
);

const UpgradeEntrySchema = z.strictObject({
  version: releasedVersion,
  ...entryFields,
});

export const UpgradesFileSchema = z.strictObject({
  unreleased: UnreleasedEntrySchema.optional(),
  versions: z
    .array(UpgradeEntrySchema)
    .max(MAX_UPGRADE_VERSIONS)
    .superRefine((entries, ctx) => {
      for (let i = 1; i < entries.length; i++) {
        const previous = entries[i - 1].version;
        const current = entries[i].version;
        // Versions already failed their own check; ordering them would throw.
        if (!parseAppVersion(previous) || !parseAppVersion(current)) continue;
        if (compareAppVersions(previous, current) !== 1) {
          ctx.addIssue({
            code: "custom",
            path: [i, "version"],
            message: `${current} follows ${previous}; versions must be strictly newest first`,
          });
        }
      }
    }),
});

export type UpgradesFile = z.infer<typeof UpgradesFileSchema>;
/** A released version's notes. */
export type UpgradeEntry = z.infer<typeof UpgradeEntrySchema>;
/** The next release's notes, before the release check stamps a version on them. */
export type UnreleasedEntry = z.infer<typeof UnreleasedEntrySchema>;

/** The file, or null when any part of it breaks the schema. */
export function parseUpgradesFile(input: unknown): UpgradesFile | null {
  const result = UpgradesFileSchema.safeParse(input);
  return result.success ? result.data : null;
}

/** The newest version the file lists, or null when it lists none. */
export function latestReleasedVersion(file: UpgradesFile): string | null {
  return file.versions[0]?.version ?? null;
}

/**
 * The entries with `from < version <= to`, oldest first: what a site moving
 * from `from` to `to` passes through. Either end may be a prerelease, e.g. a
 * site running `3.13.0-beta.0` passes through `3.13.0`. Throws on an invalid
 * version string, like `compareAppVersions`.
 */
export function entriesBetween(
  file: UpgradesFile,
  from: string,
  to: string,
): UpgradeEntry[] {
  return file.versions
    .filter(
      (entry) =>
        compareAppVersions(from, entry.version) === -1 &&
        compareAppVersions(entry.version, to) !== 1,
    )
    .reverse();
}

function parseOwnFile(): UpgradesFile {
  const result = UpgradesFileSchema.safeParse(upgradesJson);
  if (!result.success) {
    throw new Error(
      `upgrades.json does not match its schema:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

/**
 * The repository's own `upgrades.json`, as this build carries it. An invalid
 * file is a defect of the build; the tests and the release check stop it
 * before it ships.
 */
export const upgradesFile: UpgradesFile = parseOwnFile();
