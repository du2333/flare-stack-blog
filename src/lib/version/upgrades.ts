/**
 * Upgrade notes: the shape of `upgrades.json`, its two validations, and the
 * questions the readers ask of it (spec #318, section 2).
 *
 * The file lists every released version, newest first, with what a site owner
 * has to do around the upgrade. `unreleased` collects the notes of the next
 * release while it is being built; the release check (scripts/release-check.ts)
 * stamps it with the version and moves it into `versions`, so the file on
 * `main` has no `unreleased`. A release's level (major, minor, patch) comes
 * from the version numbers and is stored nowhere.
 *
 * The file has two kinds of reader, so it has two validations:
 *
 * - `checkUpgradesFile` is strict, for the repository's own file before it
 *   ships (the release check, a test): unknown keys are refused, so a typo such
 *   as `befor` cannot drop a major's warnings.
 * - `parseUpgradesFile` reads a fetched file, and the build's own file at run
 *   time. A Worker deployed months ago reads the newest upstream file, so it
 *   strips keys it does not know, ignores `unreleased`, reads an unknown
 *   `rollback` value as absent and keeps only the newest
 *   `MAX_UPGRADE_VERSIONS` entries. It still refuses the whole file for a wrong
 *   type, a bad or out-of-order version, or a text or list beyond its limit.
 *
 * The limits below are a frozen contract: old readers refuse whatever exceeds
 * them, so a later release must never write beyond them. New optional fields
 * may be added; existing ones must keep their meaning and type.
 *
 * Fetched texts are untrusted; readers show them as plain text. Nothing here
 * runs at import: the build's own file is parsed on the first call of
 * `ownUpgradesFile`. Relative imports only, so `bun` scripts load this module
 * as the Worker does.
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

type Mode = "strict" | "reader";

function object<T extends z.core.$ZodLooseShape>(mode: Mode, shape: T) {
  return mode === "strict" ? z.strictObject(shape) : z.object(shape);
}

const text = z.string().trim().min(1).max(MAX_UPGRADE_TEXT_LENGTH);

function itemList(mode: Mode) {
  return z
    .array(
      object(mode, {
        /** Stable within the entry, e.g. `secrets-as-secret`. */
        id: z
          .string()
          .max(MAX_UPGRADE_NAME_LENGTH)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        text,
      }),
    )
    .max(MAX_UPGRADE_LIST_ITEMS)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      { message: "Item ids repeat within the list" },
    );
}

const nameList = z
  .array(
    z
      .string()
      .max(MAX_UPGRADE_NAME_LENGTH)
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  )
  .max(MAX_UPGRADE_LIST_ITEMS);

const rollback = z.enum(["safe", "unsafe"]);

function noteFields(mode: Mode) {
  return {
    /** What has to be done before syncing to this version. */
    before: itemList(mode).optional(),
    /** What has to be done once this version runs. */
    after: itemList(mode).optional(),
    /** Configuration this version needs before it deploys. */
    requires: object(mode, {
      buildVars: nameList,
      secrets: nameList,
    }).optional(),
    /** Whether the previous version's code still runs on this version's data. */
    rollback:
      mode === "strict"
        ? rollback.optional()
        : rollback.optional().catch(undefined),
  };
}

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

function entrySchema(mode: Mode) {
  return object(mode, {
    version: releasedVersion,
    /** One sentence for the release as a whole. */
    summary: text,
    ...noteFields(mode),
  });
}

function versionList(mode: Mode) {
  return z.array(entrySchema(mode)).superRefine((entries, ctx) => {
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
  });
}

const UnreleasedEntrySchema = z.strictObject({
  /** Optional while PRs add items; the release check requires it. */
  summary: text.optional(),
  ...noteFields("strict"),
});

const StrictUpgradesFileSchema = z.strictObject({
  unreleased: UnreleasedEntrySchema.optional(),
  versions: versionList("strict").max(MAX_UPGRADE_VERSIONS),
});

const ReaderUpgradesFileSchema = z.object({
  versions: z.preprocess(
    // Newest first, so the newest entries are the ones kept.
    (value) =>
      Array.isArray(value) ? value.slice(0, MAX_UPGRADE_VERSIONS) : value,
    versionList("reader"),
  ),
});

/** The file as the strict validation returns it; the reader never sets `unreleased`. */
export type UpgradesFile = z.infer<typeof StrictUpgradesFileSchema>;
/** A released version's notes. */
export type UpgradeEntry = UpgradesFile["versions"][number];
/** The next release's notes, before the release check stamps a version on them. */
export type UnreleasedEntry = z.infer<typeof UnreleasedEntrySchema>;

export type UpgradesFileCheck =
  | { ok: true; file: UpgradesFile }
  | { ok: false; problems: Array<string> };

/**
 * The strict validation, for the repository's own file before it ships. Each
 * problem names where it is, e.g. `versions.1.version: ...`.
 */
export function checkUpgradesFile(input: unknown): UpgradesFileCheck {
  const result = StrictUpgradesFileSchema.safeParse(input);
  if (result.success) return { ok: true, file: result.data };
  return {
    ok: false,
    problems: result.error.issues.map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join(".")}: ${issue.message}`
        : issue.message,
    ),
  };
}

/**
 * The reader: the released entries of a fetched file, or null when the file
 * is not usable. `unreleased` is never read and is absent from the result.
 */
export function parseUpgradesFile(input: unknown): UpgradesFile | null {
  const result = ReaderUpgradesFileSchema.safeParse(input);
  if (!result.success) return null;
  return {
    versions: result.data.versions.map(({ rollback, ...entry }) =>
      rollback ? { ...entry, rollback } : entry,
    ),
  };
}

/** The newest version the file lists, or null when it lists none. */
export function latestReleasedVersion(file: UpgradesFile): string | null {
  return file.versions[0]?.version ?? null;
}

/**
 * The entries with `from < version <= to`, oldest first: what a site moving
 * from `from` to `to` passes through. Either end may be a prerelease, e.g. a
 * site running `3.13.0-beta.0` passes through `3.13.0`. Throws on an invalid
 * version string.
 */
export function entriesBetween(
  file: UpgradesFile,
  from: string,
  to: string,
): Array<UpgradeEntry> {
  for (const version of [from, to]) {
    if (!parseAppVersion(version)) {
      throw new Error(`Invalid application version: ${version}`);
    }
  }
  return file.versions
    .filter(
      (entry) =>
        compareAppVersions(from, entry.version) === -1 &&
        compareAppVersions(entry.version, to) !== 1,
    )
    .reverse();
}

/**
 * The file once `unreleased` is released as `version`: the entry moved to the
 * front of `versions` with the version first, and `unreleased` gone. Throws
 * when there is no `unreleased` or it has no `summary`; the release check
 * refuses both before it stamps.
 */
export function stampUnreleased(
  file: UpgradesFile,
  version: string,
): UpgradesFile {
  const { unreleased, versions } = file;
  if (!unreleased?.summary) {
    throw new Error("upgrades.json has no `unreleased` summary to stamp");
  }
  const { summary, ...notes } = unreleased;
  return { versions: [{ version, summary, ...notes }, ...versions] };
}

let own: UpgradesFile | undefined;

/**
 * The repository's own `upgrades.json` as this build carries it, read with the
 * reader on the first call. A file the reader refuses reads as no entries; the
 * committed-file test and the release check keep that from shipping.
 */
export function ownUpgradesFile(): UpgradesFile {
  own ??= parseUpgradesFile(upgradesJson) ?? { versions: [] };
  return own;
}

let ownUnreleased: UnreleasedEntry | null | undefined;

/**
 * The `unreleased` entry of the build's own `upgrades.json`, read leniently on
 * the first call: the notes of a prerelease build's release (the deploy
 * preflight reads them). Null when the file has none or it is not usable.
 */
export function ownUnreleasedEntry(): UnreleasedEntry | null {
  if (ownUnreleased === undefined) {
    const result = z
      .object({ summary: text.optional(), ...noteFields("reader") })
      .safeParse((upgradesJson as { unreleased?: unknown }).unreleased);
    if (result.success) {
      const { rollback, ...entry } = result.data;
      ownUnreleased = rollback ? { ...entry, rollback } : entry;
    } else {
      ownUnreleased = null;
    }
  }
  return ownUnreleased;
}
