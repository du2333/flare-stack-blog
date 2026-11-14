/**
 * Application versions: `X.Y.Z` and `X.Y.Z-<prerelease>`, ordered by semver
 * precedence. Plain TypeScript with no imports, so the Worker and the scripts
 * under `scripts/` share it without pulling in `zod`, the `semver` package or
 * any Worker-only or browser-only code.
 *
 * Build metadata (`+...`) is not part of the application's versions and is
 * refused like any other malformed string.
 */

export type AppVersion = {
  major: number;
  minor: number;
  patch: number;
  /** Dot-separated identifiers; numeric ones are numbers. Empty for a release. */
  prerelease: ReadonlyArray<string | number>;
};

export type AppVersionLevel = "major" | "minor" | "patch";

const VERSION_PATTERN =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const NUMERIC_IDENTIFIER = /^(0|[1-9]\d*)$/;
const DIGITS_ONLY = /^\d+$/;

/**
 * Parses `X.Y.Z` or `X.Y.Z-<prerelease>`, with an optional leading `v`.
 * Returns null for anything else: a missing part, a leading zero in a number
 * or numeric identifier, an empty identifier, build metadata, or a number
 * beyond the safe integer range.
 */
export function parseAppVersion(input: string): AppVersion | null {
  const match = VERSION_PATTERN.exec(input);
  if (!match) return null;
  const [, major, minor, patch, prerelease] = match;
  const core = [Number(major), Number(minor), Number(patch)];
  if (!core.every(Number.isSafeInteger)) return null;

  const identifiers: Array<string | number> = [];
  for (const identifier of prerelease?.split(".") ?? []) {
    if (NUMERIC_IDENTIFIER.test(identifier)) {
      const value = Number(identifier);
      if (!Number.isSafeInteger(value)) return null;
      identifiers.push(value);
    } else if (DIGITS_ONLY.test(identifier)) {
      return null; // numeric with a leading zero
    } else {
      identifiers.push(identifier);
    }
  }

  return {
    major: core[0],
    minor: core[1],
    patch: core[2],
    prerelease: identifiers,
  };
}

/** The version without a leading `v`, e.g. `3.13.0-beta.0`. */
export function formatAppVersion(version: AppVersion): string {
  const core = `${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease.length > 0
    ? `${core}-${version.prerelease.join(".")}`
    : core;
}

function parseOrThrow(input: string): AppVersion {
  const version = parseAppVersion(input);
  if (!version) throw new Error(`Invalid application version: ${input}`);
  return version;
}

function compareValues<T extends string | number>(a: T, b: T): -1 | 0 | 1 {
  // Strings compare by code unit; the identifiers are ASCII, so no locale applies.
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareIdentifiers(a: string | number, b: string | number) {
  // A numeric identifier sorts before an alphanumeric one.
  if (typeof a === "number" && typeof b === "string") return -1;
  if (typeof a === "string" && typeof b === "number") return 1;
  return compareValues(a, b);
}

function compareParsed(a: AppVersion, b: AppVersion): -1 | 0 | 1 {
  const core =
    compareValues(a.major, b.major) ||
    compareValues(a.minor, b.minor) ||
    compareValues(a.patch, b.patch);
  if (core !== 0) return core;

  // A release sorts after any prerelease of the same X.Y.Z.
  const aIsRelease = a.prerelease.length === 0;
  const bIsRelease = b.prerelease.length === 0;
  if (aIsRelease || bIsRelease) {
    return aIsRelease === bIsRelease ? 0 : aIsRelease ? 1 : -1;
  }

  const shared = Math.min(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < shared; i++) {
    const order = compareIdentifiers(a.prerelease[i], b.prerelease[i]);
    if (order !== 0) return order;
  }
  // When every shared identifier is equal, the shorter prerelease sorts first.
  return compareValues(a.prerelease.length, b.prerelease.length);
}

/**
 * Orders two versions by semver precedence: `-1` when `a` is older than `b`,
 * `1` when newer, `0` when equal. Throws on an invalid string.
 */
export function compareAppVersions(a: string, b: string): -1 | 0 | 1 {
  return compareParsed(parseOrThrow(a), parseOrThrow(b));
}

/**
 * The size of the step from `from` to `to`: the highest of `major`, `minor`,
 * `patch` that differs. When only the prerelease part differs (`3.13.0-beta.0`
 * to `3.13.0`, or between two prereleases of one X.Y.Z), the step is `patch`.
 * Returns null when `to` is not after `from`, so equal versions and a
 * downgrade have no level. Throws on an invalid string.
 */
export function appVersionLevel(
  from: string,
  to: string,
): AppVersionLevel | null {
  const a = parseOrThrow(from);
  const b = parseOrThrow(to);
  if (compareParsed(a, b) !== -1) return null;
  if (a.major !== b.major) return "major";
  if (a.minor !== b.minor) return "minor";
  return "patch";
}
