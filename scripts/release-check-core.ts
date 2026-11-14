/**
 * The logic of scripts/release-check.ts as a pure function: given what git and
 * the disk hold, either the reasons this release must stop or the
 * `upgrades.json` it ships with (spec #318, sections 1 to 3).
 *
 * The level of a release (major, minor, patch) comes from the version numbers.
 * When the last version is a prerelease, the level is measured from the newest
 * release `upgrades.json` lists, so `4.0.0-beta.0 → 4.0.0` is still a major.
 *
 * Every failure is reported in one run: a schema problem in the file does not
 * hide the commit, summary or migration failures.
 */
import {
  appVersionLevel,
  compareAppVersions,
  parseAppVersion,
  type AppVersionLevel,
} from "../src/lib/version/app-version.ts";
import {
  checkUpgradesFile,
  stampUnreleased,
  type UpgradesFile,
} from "../src/lib/version/upgrades.ts";

export type Commit = { sha: string; message: string };
export type AddedMigration = { name: string; sql: string };

export type ReleaseCheckInput = {
  /** The last released version (release-it's `latestVersion`). */
  from: string;
  /** The version being released (release-it's `version`). */
  to: string;
  /** The commits since the last tag, in any order; full messages, subject first. */
  commits: Array<Commit>;
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
      /**
       * `stamp`: write `file`. `already-stamped`: the file already lists `to`
       * first (a rerun after an interrupted release). `prerelease`: the file
       * lists releases only and stays as it is.
       */
      outcome: "stamp" | "already-stamped" | "prerelease";
      /** The file to write, for `stamp` only. */
      file: UpgradesFile | null;
    }
  | { ok: false; failures: Array<string> };

function isPrerelease(version: string) {
  return (parseAppVersion(version)?.prerelease.length ?? 0) > 0;
}

// The scope may hold neither parentheses nor a line break.
const BREAKING_SUBJECT = /^\w+(?:\([^()\r\n]*\))?!:/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;
const REVERTS = /This reverts commit ([0-9a-f]{40})\./g;

/**
 * A conventional commit marked breaking: `type!:` or `type(scope)!:` on the
 * subject line, or a `BREAKING CHANGE:` line in the footer block (the last
 * paragraph after the subject).
 */
export function isBreakingCommit(message: string): boolean {
  const [subject = "", ...rest] = message.trim().split(/\r?\n/);
  if (BREAKING_SUBJECT.test(subject)) return true;
  const paragraphs = rest
    .join("\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const footer = paragraphs.at(-1);
  return footer !== undefined && BREAKING_FOOTER.test(footer);
}

/**
 * The breaking commits that still count: a commit reverted by a later commit
 * of the range (git's `This reverts commit <sha>.`) does not, unless that
 * revert is itself reverted.
 */
export function breakingCommits(commits: Array<Commit>): Array<Commit> {
  const revertedBy = new Map<string, Array<string>>();
  for (const commit of commits) {
    for (const [, sha] of commit.message.matchAll(REVERTS)) {
      revertedBy.set(sha, [...(revertedBy.get(sha) ?? []), commit.sha]);
    }
  }
  const memo = new Map<string, boolean>();
  // A revert names an older commit, so the chain ends.
  const inEffect = (sha: string): boolean => {
    const known = memo.get(sha);
    if (known !== undefined) return known;
    const effective = !(revertedBy.get(sha) ?? []).some(inEffect);
    memo.set(sha, effective);
    return effective;
  };
  return commits.filter(
    (commit) => isBreakingCommit(commit.message) && inEffect(commit.sha),
  );
}

export type SqlTokens = {
  /** The SQL with comments and quoted strings or identifiers blanked out. */
  code: string;
  /** The text of each `--` comment, after the dashes. */
  lineComments: Array<string>;
};

const QUOTE_END: Record<string, string> = {
  "'": "'",
  '"': '"',
  "`": "`",
  "[": "]",
};

/** Splits SQL into its code and its line comments. */
export function scanSql(sql: string): SqlTokens {
  let code = "";
  const lineComments: Array<string> = [];
  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];
    if (char === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      lineComments.push(sql.slice(i + 2, stop));
      i = stop;
    } else if (char === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      code += " ";
    } else if (char in QUOTE_END) {
      const close = QUOTE_END[char];
      // A doubled closing quote escapes it and keeps the string open.
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === close && close !== "]" && sql[j + 1] === close) j += 2;
        else if (sql[j] === close) break;
        else j++;
      }
      i = j + 1;
      code += " ";
    } else {
      code += char;
      i++;
    }
  }
  return { code, lineComments };
}

const DESTRUCTIVE_KEYWORD = /\b(DROP|RENAME)\b/gi;
const ROLLBACK_SAFE = /^[ \t]*rollback-safe:(.*)$/;

type MigrationVerdict =
  | { destructive: false }
  | {
      destructive: true;
      keywords: Array<string>;
      marker: "reason" | "empty" | "none";
    };

export function inspectMigration(sql: string): MigrationVerdict {
  const { code, lineComments } = scanSql(sql);
  const keywords = [
    ...new Set(
      [...code.matchAll(DESTRUCTIVE_KEYWORD)].map((match) =>
        match[1].toUpperCase(),
      ),
    ),
  ].sort();
  if (keywords.length === 0) return { destructive: false };
  const reasons = lineComments.flatMap((comment) => {
    const match = ROLLBACK_SAFE.exec(comment);
    return match ? [match[1].trim()] : [];
  });
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

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * What the checks need from the file, read leniently so they still run when
 * the strict validation fails elsewhere in the file.
 */
function lenientRead(file: unknown) {
  const root = record(file);
  const versions = Array.isArray(root?.versions) ? root.versions : [];
  const listed = versions.map((entry) => {
    const version = record(entry)?.version;
    return typeof version === "string" && parseAppVersion(version)
      ? version
      : null;
  });
  return {
    unreleased:
      root && "unreleased" in root ? record(root.unreleased) : undefined,
    hasUnreleasedKey: root !== undefined && "unreleased" in root,
    listed,
    entries: versions.map(record),
  };
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyList(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

/** The build variables and Secrets `requires` names, read leniently. */
function requiredNames(requires: unknown): Array<string> {
  const lists = record(requires);
  return (["buildVars", "secrets"] as const).flatMap((key) => {
    const names = lists?.[key];
    return Array.isArray(names) ? names.map(String) : [];
  });
}

export function checkRelease(input: ReleaseCheckInput): ReleaseCheckResult {
  const { from, to, addedMigrations } = input;
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

  const checked = checkUpgradesFile(input.file);
  if (!checked.ok) {
    failures.push(
      `upgrades.json does not match its schema:\n${checked.problems.map((problem) => `  ${problem}`).join("\n")}`,
    );
  }

  const { unreleased, hasUnreleasedKey, listed, entries } = lenientRead(
    input.file,
  );
  const prerelease = isPrerelease(to);
  // A rerun after the stamp was written: `to` is on top and nothing is pending.
  const alreadyStamped = !prerelease && !hasUnreleasedKey && listed[0] === to;
  const previousListed = alreadyStamped ? listed[1] : listed[0];

  const latestRelease = previousListed ?? null;
  const base =
    isPrerelease(from) &&
    latestRelease &&
    compareAppVersions(latestRelease, from) === -1
      ? latestRelease
      : from;
  const level = appVersionLevel(base, to);
  if (!level) {
    failures.push(`${to} does not come after ${base}; nothing to release.`);
    return { ok: false, failures };
  }
  const step = `${base} → ${to} is a ${level}`;

  const breaking = breakingCommits(input.commits);
  if (breaking.length > 0 && level !== "major") {
    const counted =
      breaking.length === 1
        ? "A commit since the last tag is"
        : `${breaking.length} commits since the last tag are`;
    failures.push(
      `${counted} marked breaking, so this release must be a major, but ${step}:\n${breaking.map((commit) => `  ${commit.sha.slice(0, 8)} ${firstLine(commit.message)}`).join("\n")}`,
    );
  }

  if (!isPrerelease(from) && previousListed !== from) {
    failures.push(
      `upgrades.json lists ${previousListed ?? "no version"} as the newest release, but the last release is ${from}; its first entry must be the last release.`,
    );
  }

  // The notes this release ships with: `unreleased`, or on a rerun the entry stamped already.
  const notes = alreadyStamped ? entries[0] : unreleased;
  if (!alreadyStamped && !hasUnreleasedKey) {
    failures.push(
      "upgrades.json has no `unreleased` entry: add one with a one-sentence `summary` of this release.",
    );
  } else {
    if (!hasText(notes?.summary)) {
      failures.push(
        "`unreleased` in upgrades.json has no `summary`: write one sentence that sums up this release.",
      );
    }
    if (level === "major" && !nonEmptyList(notes?.before)) {
      failures.push(
        `This release is a major (${base} → ${to}), and \`unreleased\` in upgrades.json has no \`before\` items: list what a site owner must do before syncing.`,
      );
    }
    // A minor or patch syncs with nothing done first, and the deploy preflight
    // checks `requires` only across a major, so required configuration is breaking.
    const required = requiredNames(notes?.requires);
    if (level !== "major" && required.length > 0) {
      failures.push(
        `\`unreleased\` in upgrades.json requires ${required.join(", ")}, but ${step}. Required configuration belongs in a major: make it optional, or release a major.`,
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

  if (failures.length > 0 || !checked.ok) return { ok: false, failures };
  if (prerelease) {
    return { ok: true, base, level, outcome: "prerelease", file: null };
  }
  if (alreadyStamped) {
    return { ok: true, base, level, outcome: "already-stamped", file: null };
  }

  const stamped = checkUpgradesFile(stampUnreleased(checked.file, to));
  if (!stamped.ok) {
    return {
      ok: false,
      failures: [
        `upgrades.json with ${to} stamped on \`unreleased\` breaks its schema:\n${stamped.problems.map((problem) => `  ${problem}`).join("\n")}`,
      ],
    };
  }
  return { ok: true, base, level, outcome: "stamp", file: stamped.file };
}
