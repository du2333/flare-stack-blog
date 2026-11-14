import * as kvStore from "@/features/cache/kv-store";
import type {
  CachedUpdateCheck,
  UpdateCheckResult,
} from "@/features/version/update-check.schema";
import {
  CachedUpdateCheckSchema,
  UpdateCheckResultSchema,
} from "@/features/version/update-check.schema";
import type { ApplicationRelease } from "@/features/version/version.schema";
import {
  ApplicationReleaseSchema,
  RunningApplicationReleaseVersionSchema,
  VERSION_CACHE_KEYS,
} from "@/features/version/version.schema";
import { ms } from "@/lib/duration";
import { serverEnv } from "@/lib/env/server.env";
import type { Result } from "@/lib/errors";
import { err, ok } from "@/lib/errors";
import { appVersionLevel, compareAppVersions } from "@/lib/version/app-version";
import {
  entriesBetween,
  latestReleasedVersion,
  parseUpgradesFile,
} from "@/lib/version/upgrades";

const GITHUB_REPO = "du2333/flare-stack-blog";
const DEFAULT_UPDATE_SOURCE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/upgrades.json`;
const RELEASE_CACHE_TTL = "6h";
// A failed check is remembered so every admin page load does not retry it.
const FAILURE_CACHE_TTL = "30m";
const GITHUB_REQUEST_TIMEOUT = ms("5s");
// The file grows by a few hundred bytes a release; far past this it is not ours.
const MAX_UPGRADES_FILE_BYTES = 512 * 1024;

type VersionContext = BaseContext & { executionCtx: ExecutionContext };

/** Reads the upgrades file and returns its parsed JSON; throws when it cannot. */
type ReadUpgradesFile = (context: VersionContext) => Promise<unknown>;
/** Reads the latest release from the release page; throws when it cannot. */
type ReadLatestRelease = (
  context: VersionContext,
) => Promise<ApplicationRelease>;

type CheckForUpdateResult = Result<
  UpdateCheckResult,
  { reason: "FETCH_FAILED" }
>;

/** Why the upgrades file was not used, in a word, for the logs. */
type FileRefusal =
  | "status"
  | "timeout"
  | "size"
  | "json"
  | "schema"
  | "empty"
  | "network";

/** A reader's failure with the word the logs record. */
export class UpdateSourceError extends Error {
  constructor(
    readonly refusal: FileRefusal,
    message: string,
  ) {
    super(message);
    this.name = "UpdateSourceError";
  }
}

export type VersionChecker = {
  check: (context: VersionContext) => Promise<CheckForUpdateResult>;
  refresh: (context: VersionContext) => Promise<CheckForUpdateResult>;
  /** The last checked release from the cache; never fetches. */
  cached: (context: BaseContext) => Promise<UpdateCheckResult | null>;
};

export function createVersionChecker({
  getCurrentVersion,
  readUpgradesFile,
  readLatestRelease,
}: {
  getCurrentVersion: () => string;
  readUpgradesFile: ReadUpgradesFile;
  readLatestRelease: ReadLatestRelease;
}): VersionChecker {
  /** One real fetch: the upgrades file first, the release page after it. */
  async function fetchUpdate(
    context: VersionContext,
    runningVersion: string,
  ): Promise<CachedUpdateCheck> {
    let refusal: FileRefusal;
    try {
      const file = parseUpgradesFile(await readUpgradesFile(context));
      const latest = file ? latestReleasedVersion(file) : null;
      if (file && latest) {
        logSource({ source: "upstream-file" });
        return {
          latestVersion: `v${latest}`,
          releaseUrl: releasePageOf(latest),
          notesAvailable: true,
          notesSince: runningVersion,
          entries: entriesBetween(file, runningVersion, latest),
        };
      }
      refusal = file ? "empty" : "schema";
    } catch (error) {
      refusal = refusalOf(error);
    }

    try {
      const release = ApplicationReleaseSchema.parse(
        await readLatestRelease(context),
      );
      logSource({ source: "release-page", fileRefused: refusal });
      return {
        latestVersion: release.version,
        releaseUrl: release.releaseUrl,
        notesAvailable: false,
        notesSince: runningVersion,
        entries: [],
      };
    } catch (error) {
      throw new Error(
        `no update source answered (upgrades file: ${refusal}): ${errorMessage(error)}`,
      );
    }
  }

  async function resolve(
    context: VersionContext,
    refresh: boolean,
  ): Promise<CheckForUpdateResult> {
    try {
      const runningVersion =
        RunningApplicationReleaseVersionSchema.parse(getCurrentVersion());
      const fetcher = async () => {
        try {
          return await fetchUpdate(context, runningVersion);
        } catch (error) {
          context.executionCtx.waitUntil(
            kvStore.put(context, VERSION_CACHE_KEYS.recentFailure, "1", {
              ttl: FAILURE_CACHE_TTL,
            }),
          );
          throw error;
        }
      };
      let update: CachedUpdateCheck;

      if (refresh) {
        update = await fetcher();
        context.executionCtx.waitUntil(
          kvStore.put(
            context,
            VERSION_CACHE_KEYS.latestRelease,
            JSON.stringify(update),
            { ttl: RELEASE_CACHE_TTL },
          ),
        );
      } else {
        update = await kvStore.remember(
          context,
          VERSION_CACHE_KEYS.latestRelease,
          cacheFor(runningVersion),
          async () => {
            if (await kvStore.get(context, VERSION_CACHE_KEYS.recentFailure)) {
              throw new Error(
                "version check failed recently; refresh to retry",
              );
            }
            return await fetcher();
          },
          { ttl: RELEASE_CACHE_TTL },
        );
      }

      return ok(toResult(update, runningVersion));
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "version check failed",
          error: errorMessage(error),
        }),
      );
      return err({ reason: "FETCH_FAILED" });
    }
  }

  async function cached(
    context: BaseContext,
  ): Promise<UpdateCheckResult | null> {
    const stored = await kvStore.get(context, VERSION_CACHE_KEYS.latestRelease);
    if (!stored) return null;
    try {
      const runningVersion =
        RunningApplicationReleaseVersionSchema.parse(getCurrentVersion());
      const update = cacheFor(runningVersion).parse(JSON.parse(stored));
      return toResult(update, runningVersion);
    } catch {
      return null;
    }
  }

  return {
    check: (context) => resolve(context, false),
    refresh: (context) => resolve(context, true),
    cached,
  };
}

/**
 * A cached value the running version can answer from. A value of another
 * format reads as no cache, and so does one whose notes start after the
 * running version (a rollback): the entries it would need were not kept.
 */
function cacheFor(runningVersion: string) {
  return CachedUpdateCheckSchema.refine(
    (update) =>
      !update.notesAvailable ||
      compareAppVersions(runningVersion, update.notesSince) !== -1,
  );
}

/** The answer for the running version, from a fetch or the cache. */
function toResult(
  update: CachedUpdateCheck,
  runningVersion: string,
): UpdateCheckResult {
  const level = appVersionLevel(runningVersion, update.latestVersion);
  return UpdateCheckResultSchema.parse({
    latestVersion: update.latestVersion,
    currentVersion: runningVersion,
    hasUpdate: level !== null,
    releaseUrl: update.releaseUrl,
    level,
    entries: level
      ? update.entries.filter(
          (entry) =>
            compareAppVersions(runningVersion, entry.version) === -1 &&
            compareAppVersions(entry.version, update.latestVersion) !== 1,
        )
      : [],
    notesAvailable: update.notesAvailable,
  });
}

function releasePageOf(version: string) {
  return `https://github.com/${GITHUB_REPO}/releases/tag/v${version}`;
}

function refusalOf(error: unknown): FileRefusal {
  if (error instanceof UpdateSourceError) return error.refusal;
  if (error instanceof Error && error.name === "TimeoutError") return "timeout";
  return "network";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function logSource(fields: { source: string; fileRefused?: FileRefusal }) {
  console.log(JSON.stringify({ message: "version check fetched", ...fields }));
}

/**
 * The upgrades file's address: `UPDATE_SOURCE_URL` when it is an `https:` URL
 * (rehearsals point it at their own branch), otherwise upstream `main`.
 */
export function upgradesFileUrl(configured: string | undefined): string {
  if (!configured) return DEFAULT_UPDATE_SOURCE_URL;
  if (URL.canParse(configured) && new URL(configured).protocol === "https:") {
    return configured;
  }
  console.warn(
    JSON.stringify({
      message: "UPDATE_SOURCE_URL ignored: not an https URL",
    }),
  );
  return DEFAULT_UPDATE_SOURCE_URL;
}

/**
 * Fetches the upgrades file and parses it as JSON. Throws an
 * `UpdateSourceError` for a non-2xx status, a body beyond the size cap, or a
 * body that is not JSON; a timeout or network error is thrown as it comes.
 */
export async function readUpgradesFileFromUrl(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": "flare-stack-blog" },
    signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new UpdateSourceError(
      "status",
      `upgrades file answered ${response.status}`,
    );
  }

  const declared = Number(response.headers.get("content-length"));
  if (declared > MAX_UPGRADES_FILE_BYTES) {
    await response.body?.cancel();
    throw new UpdateSourceError(
      "size",
      `upgrades file is ${declared} bytes, over the cap`,
    );
  }

  const text = await readTextUpTo(response, MAX_UPGRADES_FILE_BYTES);
  try {
    return JSON.parse(text);
  } catch {
    throw new UpdateSourceError("json", "upgrades file is not JSON");
  }
}

/** The body as text, refusing it once it passes `limit` bytes. */
async function readTextUpTo(response: Response, limit: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Array<Uint8Array> = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new UpdateSourceError("size", "upgrades file is over the cap");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** The latest release as the tag the release page redirects to. */
export async function fetchLatestReleaseFromReleasePage(): Promise<ApplicationRelease> {
  const response = await fetch(
    `https://github.com/${GITHUB_REPO}/releases/latest`,
    {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": "flare-stack-blog" },
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT),
    },
  );

  const location = response.headers.get("location");
  const releaseUrl = location ? new URL(location, "https://github.com") : null;
  const tag = releaseUrl
    ? /\/releases\/tag\/([^/]+)$/.exec(releaseUrl.pathname)?.[1]
    : undefined;
  if (!releaseUrl || !tag) {
    throw new Error(
      `GitHub release page did not redirect to a tag: ${response.status}`,
    );
  }

  return {
    version: decodeURIComponent(tag),
    releaseUrl: releaseUrl.toString(),
  };
}

export const versionChecker = createVersionChecker({
  getCurrentVersion: () => __APP_VERSION__,
  readUpgradesFile: (context) =>
    readUpgradesFileFromUrl(
      upgradesFileUrl(serverEnv(context.env).UPDATE_SOURCE_URL),
    ),
  readLatestRelease: fetchLatestReleaseFromReleasePage,
});
