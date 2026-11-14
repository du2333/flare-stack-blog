/**
 * The logic of scripts/release-check.ts as a pure function: given what git and
 * the disk hold, either the reasons this release must stop or the
 * `upgrades.json` it ships with (spec #318, sections 1 to 3).
 *
 * The level of a release (major, minor, patch) comes from the version numbers.
 * When the last version is a prerelease, the level is measured from the newest
 * release `upgrades.json` lists, so `4.0.0-beta.0 → 4.0.0` is still a major.
 */
import { z } from "zod";
import {
  appVersionLevel,
  compareAppVersions,
  parseAppVersion,
  type AppVersionLevel,
} from "../src/lib/version/app-version.ts";
import {
  latestReleasedVersion,
  UpgradesFileSchema,
  type UpgradesFile,
} from "../src/lib/version/upgrades.ts";

export type AddedMigration = { name: string; sql: string };

export type ReleaseCheckInput = {
  /** The last released version (release-it's `latestVersion`). */
  from: string;
  /** The version being released (release-it's `version`). */
  to: string;
  /** Full messages of the commits since the last tag, subject first. */
  commits: Array<string>;
  /** `upgrades.json` as read from disk, before validation. */
  file: unknown;
  /** Migration files added since the last tag. */
  addedMigrations: Array<AddedMigration>;
};

export type ReleaseCheckResult =
  | {
      ok: true;
      /** The version the level is measured from. */
      base: string;
      level: AppVersionLevel;
      prerelease: boolean;
      /** The file to write: `unreleased` stamped and moved; null for a prerelease. */
      file: UpgradesFile | null;
    }
  | { ok: false; failures: Array<string> };

const BREAKING_SUBJECT = /^\w+(?:\([^)]*\))?!:/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;

/** A conventional commit marked breaking by `type(scope)!:` or a footer. */
export function isBreakingCommit(message: string): boolean {
  return (
    BREAKING_SUBJECT.test(message.trimStart()) || BREAKING_FOOTER.test(message)
  );
}

/**
 * The SQL with comments and quoted strings or identifiers blanked out, so a
 * keyword in a comment or in data does not count.
 */
export function sqlCode(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];
    if (char === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end;
    } else if (char === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      out += " ";
    } else if (char === "'" || char === '"' || char === "`") {
      // A doubled quote inside the string escapes it and keeps the string open.
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === char && sql[j + 1] === char) j += 2;
        else if (sql[j] === char) break;
        else j++;
      }
      i = j + 1;
      out += " ";
    } else {
      out += char;
      i++;
    }
  }
  return out;
}

const DESTRUCTIVE_KEYWORD = /\b(DROP|RENAME)\b/gi;
const ROLLBACK_SAFE_LINE = /^[ \t]*--[ \t]*rollback-safe:(.*)$/gm;

type MigrationVerdict =
  | { destructive: false }
  | {
      destructive: true;
      keywords: Array<string>;
      marker: "reason" | "empty" | "none";
    };

export function inspectMigration(sql: string): MigrationVerdict {
  const keywords = [
    ...new Set(
      [...sqlCode(sql).matchAll(DESTRUCTIVE_KEYWORD)].map((match) =>
        match[1].toUpperCase(),
      ),
    ),
  ].sort();
  if (keywords.length === 0) return { destructive: false };
  const reasons = [...sql.matchAll(ROLLBACK_SAFE_LINE)].map((match) =>
    match[1].trim(),
  );
  const marker = reasons.some((reason) => reason.length > 0)
    ? "reason"
    : reasons.length > 0
      ? "empty"
      : "none";
  return { destructive: true, keywords, marker };
}

function firstLine(message: string) {
  return message.trim().split("\n")[0];
}

function validateFile(file: unknown, failures: Array<string>) {
  const result = UpgradesFileSchema.safeParse(file);
  if (result.success) return result.data;

  const missingSummary = result.error.issues.some(
    (issue) => issue.path.join(".") === "unreleased.summary",
  );
  if (missingSummary) {
    failures.push(
      "`unreleased` in upgrades.json has no `summary`: write one sentence that sums up this release.",
    );
  }
  const rest = result.error.issues.filter(
    (issue) => issue.path.join(".") !== "unreleased.summary",
  );
  if (rest.length > 0) {
    failures.push(
      `upgrades.json does not match its schema:\n${z.prettifyError(new z.ZodError(rest))}`,
    );
  }
  return null;
}

function levelBase(from: string, file: UpgradesFile | null) {
  if (parseAppVersion(from)!.prerelease.length === 0 || !file) return from;
  const latest = latestReleasedVersion(file);
  return latest && compareAppVersions(latest, from) === -1 ? latest : from;
}

export function checkRelease(input: ReleaseCheckInput): ReleaseCheckResult {
  const { from, to, commits, addedMigrations } = input;
  const failures: Array<string> = [];

  for (const [label, version] of [
    ["last", from],
    ["new", to],
  ] as const) {
    if (!parseAppVersion(version)) {
      failures.push(`The ${label} version "${version}" is not a version.`);
    }
  }
  if (failures.length > 0) return { ok: false, failures };

  const file = validateFile(input.file, failures);
  const base = levelBase(from, file);
  const level = appVersionLevel(base, to);
  const prerelease = parseAppVersion(to)!.prerelease.length > 0;
  if (!level) {
    failures.push(`${to} does not come after ${base}; nothing to release.`);
    return { ok: false, failures };
  }
  const step = `${base} → ${to} is a ${level}`;

  const breaking = commits.filter(isBreakingCommit);
  if (breaking.length > 0 && level !== "major") {
    failures.push(
      `${breaking.length === 1 ? "A commit" : `${breaking.length} commits`} since ${from} ${breaking.length === 1 ? "is" : "are"} marked breaking, so this release must be a major, but ${step}:\n${breaking.map((message) => `  ${firstLine(message)}`).join("\n")}`,
    );
  }

  if (file) {
    const latest = latestReleasedVersion(file);
    if (parseAppVersion(from)!.prerelease.length === 0 && latest !== from) {
      failures.push(
        `upgrades.json lists ${latest ?? "no version"} as the newest release, but the last release is ${from}; its first entry must be the last release.`,
      );
    }
    if (!file.unreleased) {
      failures.push(
        "upgrades.json has no `unreleased` entry: add one with a one-sentence `summary` of this release.",
      );
    } else if (
      level === "major" &&
      (file.unreleased.before ?? []).length === 0
    ) {
      failures.push(
        `This release is a major (${base} → ${to}), and \`unreleased\` in upgrades.json has no \`before\` items: list what a site owner must do before syncing.`,
      );
    }
  }

  if (level !== "major") {
    for (const migration of addedMigrations) {
      const verdict = inspectMigration(migration.sql);
      if (!verdict.destructive || verdict.marker === "reason") continue;
      const missing =
        verdict.marker === "empty"
          ? "its `-- rollback-safe:` line gives no reason"
          : "it has no `-- rollback-safe: <reason>` line";
      failures.push(
        `Migration ${migration.name} uses ${verdict.keywords.join(" and ")}, ${step}, and ${missing}. Say in that line why ${base}'s code still runs on the migrated database, or release a major.`,
      );
    }
  }

  if (failures.length > 0 || !file) return { ok: false, failures };
  if (prerelease) return { ok: true, base, level, prerelease, file: null };

  const { unreleased, versions } = file;
  const stamped = UpgradesFileSchema.safeParse({
    versions: [{ version: to, ...unreleased }, ...versions],
  });
  if (!stamped.success) {
    return {
      ok: false,
      failures: [
        `upgrades.json with ${to} stamped on \`unreleased\` breaks its schema:\n${z.prettifyError(stamped.error)}`,
      ],
    };
  }
  return { ok: true, base, level, prerelease, file: stamped.data };
}
