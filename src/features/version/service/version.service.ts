import * as kvStore from "@/features/cache/kv-store";
import { withDismissal } from "@/features/version/service/dismissed-update.service";
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
  ApplicationReleaseVersionSchema,
  RunningApplicationReleaseVersionSchema,
  VERSION_CACHE_KEYS,
} from "@/features/version/version.schema";
import { ms } from "@/lib/duration";
import { serverEnv } from "@/lib/env/server.env";
import type { Result } from "@/lib/errors";
import { err, ok } from "@/lib/errors";
import { appVersionLevel, compareAppVersions } from "@/lib/version/app-version";
import type { UpgradeEntry } from "@/lib/version/upgrades";
import {
  entriesBetween,
  latestReleasedVersion,
  parseUpgradesFile,
} from "@/lib/version/upgrades";

const GITHUB_REPO = "du2333/flare-stack-blog";
const DEFAULT_UPDATE_SOURCE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/upgrades.json`;
const RELEASE_CACHE_TTL = "6h";
// An answer from the release page carries no notes; the file is tried again soon.
const FALLBACK_CACHE_TTL = "30m";
// A failed check is remembered so every admin page load does not retry it.
const FAILURE_CACHE_TTL = "30m";
const UPDATE_REQUEST_TIMEOUT = ms("5s");
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
  | "encoding"
  | "insecure-redirect"
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
  async function fetchUpdate(context: VersionContext): Promise<Answer> {
    let refusal: FileRefusal;
    try {
      const file = parseUpgradesFile(await readUpgradesFile(context));
      const latest = file ? latestReleasedVersion(file) : null;
      if (file && latest) {
        logSource({ source: "upstream-file" });
        return {
          latestVersion: `v${latest}`,
          releaseUrl: releasePageOf(`v${latest}`),
          notesAvailable: true,
          notes: file.versions,
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
        notes: [],
      };
    } catch (error) {
      throw new Error(
        `no update source answered (upgrades file: ${refusal}): ${errorMessage(error)}`,
      );
    }
  }

  /** Fetches, stores the answer for the running version, and returns it. */
  async function fetchAndStore(
    context: VersionContext,
    runningVersion: string,
  ): Promise<UpdateCheckResult> {
    let answer: Answer;
    try {
      answer = await fetchUpdate(context);
    } catch (error) {
      context.executionCtx.waitUntil(
        kvStore.put(context, VERSION_CACHE_KEYS.recentFailure, "1", {
          ttl: FAILURE_CACHE_TTL,
        }),
      );
      throw error;
    }
    const result = toResult(answer, runningVersion);
    const stored: CachedUpdateCheck = {
      latestVersion: result.latestVersion,
      releaseUrl: result.releaseUrl,
      notesAvailable: result.notesAvailable,
      notesSince: runningVersion,
      // Only what the running version and later ones can still need.
      entries: result.entries,
    };
    context.executionCtx.waitUntil(
      kvStore.put(
        context,
        VERSION_CACHE_KEYS.latestRelease,
        JSON.stringify(stored),
        // A note-less answer is retried soon, so the file gets another chance.
        { ttl: answer.notesAvailable ? RELEASE_CACHE_TTL : FALLBACK_CACHE_TTL },
      ),
    );
    return result;
  }

  async function readCache(
    context: BaseContext,
    runningVersion: string,
  ): Promise<UpdateCheckResult | null> {
    const stored = await kvStore.get(context, VERSION_CACHE_KEYS.latestRelease);
    if (!stored) return null;
    try {
      const update = cacheFor(runningVersion).parse(JSON.parse(stored));
      return toResult(
        // Stored oldest first; the notes are read newest first, as filed.
        { ...update, notes: [...update.entries].reverse() },
        runningVersion,
      );
    } catch {
      return null;
    }
  }

  async function resolve(
    context: VersionContext,
    refresh: boolean,
  ): Promise<CheckForUpdateResult> {
    try {
      const runningVersion =
        RunningApplicationReleaseVersionSchema.parse(getCurrentVersion());
      if (!refresh) {
        const fromCache = await readCache(context, runningVersion);
        if (fromCache) return ok(await withDismissal(context, fromCache));
        if (await kvStore.get(context, VERSION_CACHE_KEYS.recentFailure)) {
          throw new Error("version check failed recently; refresh to retry");
        }
      }
      return ok(
        await withDismissal(
          context,
          await fetchAndStore(context, runningVersion),
        ),
      );
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
    const parsed =
      RunningApplicationReleaseVersionSchema.safeParse(getCurrentVersion());
    return parsed.success ? readCache(context, parsed.data) : null;
  }

  return {
    check: (context) => resolve(context, false),
    refresh: (context) => resolve(context, true),
    cached,
  };
}

/** A fetched or cached answer, before it is put to the running version. */
type Answer = {
  latestVersion: string;
  releaseUrl: string;
  notesAvailable: boolean;
  /** Upgrade entries, newest first as the file lists them. */
  notes: Array<UpgradeEntry>;
};

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

/** The answer for the running version: the one place its entries are chosen. */
function toResult(answer: Answer, runningVersion: string): UpdateCheckResult {
  const level = appVersionLevel(runningVersion, answer.latestVersion);
  return UpdateCheckResultSchema.parse({
    latestVersion: answer.latestVersion,
    currentVersion: runningVersion,
    hasUpdate: level !== null,
    releaseUrl: answer.releaseUrl,
    level,
    entries: entriesBetween(
      { versions: answer.notes },
      runningVersion,
      answer.latestVersion,
    ),
    notesAvailable: answer.notesAvailable,
    // Not part of the release data: `check` and `refresh` read it from KV.
    dismissed: false,
  });
}

/** The release page of a tag such as `v3.12.1`. */
function releasePageOf(tag: string) {
  return `https://github.com/${GITHUB_REPO}/releases/tag/${tag}`;
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
 * without credentials (rehearsals point it at their own branch), otherwise
 * upstream `main`. The warning never repeats the value.
 */
export function upgradesFileUrl(configured: string | undefined): string {
  if (!configured) return DEFAULT_UPDATE_SOURCE_URL;
  const url = URL.canParse(configured) ? new URL(configured) : null;
  if (url && url.protocol === "https:" && !url.username && !url.password) {
    return configured;
  }
  console.warn(
    JSON.stringify({
      message:
        "UPDATE_SOURCE_URL ignored: not an https URL without credentials",
    }),
  );
  return DEFAULT_UPDATE_SOURCE_URL;
}

/**
 * Fetches the upgrades file and parses it as JSON. Throws an
 * `UpdateSourceError` for a redirect that ends outside `https:`, a non-2xx
 * status, a body beyond the size cap or not UTF-8, or a body that is not
 * JSON; a timeout or network error is thrown as it comes.
 */
export async function readUpgradesFileFromUrl(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const response = await fetcher(url, {
    headers: { "User-Agent": "flare-stack-blog" },
    signal: AbortSignal.timeout(UPDATE_REQUEST_TIMEOUT),
  });
  // Redirects are followed; the address the body came from must still be https.
  if (
    !URL.canParse(response.url) ||
    new URL(response.url).protocol !== "https:"
  ) {
    await response.body?.cancel();
    throw new UpdateSourceError(
      "insecure-redirect",
      "upgrades file was served from outside https",
    );
  }
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
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new UpdateSourceError("encoding", "upgrades file is not UTF-8");
  }
}

const RELEASE_TAG_PREFIX = `/${GITHUB_REPO}/releases/tag/`;

/**
 * The latest release as the tag the release page redirects to. The Admin opens
 * the address, so only this repository's `releases/tag/vX.Y.Z` on
 * `https://github.com` is accepted, and the address is rebuilt from the tag.
 */
export async function fetchLatestReleaseFromReleasePage(
  fetcher: typeof fetch = fetch,
): Promise<ApplicationRelease> {
  const response = await fetcher(
    `https://github.com/${GITHUB_REPO}/releases/latest`,
    {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": "flare-stack-blog" },
      signal: AbortSignal.timeout(UPDATE_REQUEST_TIMEOUT),
    },
  );

  const location = response.headers.get("location");
  const target =
    location && URL.canParse(location, "https://github.com")
      ? new URL(location, "https://github.com")
      : null;
  const tag =
    target?.origin === "https://github.com" &&
    target.pathname.startsWith(RELEASE_TAG_PREFIX)
      ? target.pathname.slice(RELEASE_TAG_PREFIX.length)
      : undefined;
  if (!tag || !ApplicationReleaseVersionSchema.safeParse(tag).success) {
    throw new Error(
      `GitHub release page did not redirect to a release tag: ${response.status}`,
    );
  }

  return { version: tag, releaseUrl: releasePageOf(tag) };
}

export const versionChecker = createVersionChecker({
  getCurrentVersion: () => __APP_VERSION__,
  readUpgradesFile: (context) =>
    readUpgradesFileFromUrl(
      upgradesFileUrl(serverEnv(context.env).UPDATE_SOURCE_URL),
    ),
  readLatestRelease: () => fetchLatestReleaseFromReleasePage(),
});
