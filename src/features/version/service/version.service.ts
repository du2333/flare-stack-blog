import * as kvStore from "@/features/cache/kv-store";
import type {
  ApplicationRelease,
  UpdateCheckResult,
} from "@/features/version/version.schema";
import {
  ApplicationReleaseSchema,
  GitHubReleaseSchema,
  RunningApplicationReleaseVersionSchema,
  UpdateCheckResultSchema,
  VERSION_CACHE_KEYS,
} from "@/features/version/version.schema";
import { ms } from "@/lib/duration";
import { serverEnv } from "@/lib/env/server.env";
import type { Result } from "@/lib/errors";
import { err, ok } from "@/lib/errors";

const GITHUB_REPO = "du2333/flare-stack-blog";
const RELEASE_CACHE_TTL = "6h";
const GITHUB_REQUEST_TIMEOUT = ms("5s");

type VersionContext = BaseContext & { executionCtx: ExecutionContext };
type FetchLatestRelease = (
  context: VersionContext,
) => Promise<ApplicationRelease>;

type CheckForUpdateResult = Result<
  UpdateCheckResult,
  { reason: "FETCH_FAILED" }
>;

export type VersionChecker = {
  check: (context: VersionContext) => Promise<CheckForUpdateResult>;
  refresh: (context: VersionContext) => Promise<CheckForUpdateResult>;
};

export function createVersionChecker({
  getCurrentVersion,
  fetchLatestRelease,
}: {
  getCurrentVersion: () => string;
  fetchLatestRelease: FetchLatestRelease;
}): VersionChecker {
  async function resolve(
    context: VersionContext,
    refresh: boolean,
  ): Promise<CheckForUpdateResult> {
    try {
      const runningVersion =
        RunningApplicationReleaseVersionSchema.parse(getCurrentVersion());
      const fetcher = async () =>
        ApplicationReleaseSchema.parse(await fetchLatestRelease(context));
      let latestRelease: ApplicationRelease;

      if (refresh) {
        latestRelease = await fetcher();
        context.executionCtx.waitUntil(
          kvStore.put(
            context,
            VERSION_CACHE_KEYS.latestRelease,
            JSON.stringify(latestRelease),
            { ttl: RELEASE_CACHE_TTL },
          ),
        );
      } else {
        latestRelease = await kvStore.remember(
          context,
          VERSION_CACHE_KEYS.latestRelease,
          ApplicationReleaseSchema,
          fetcher,
          { ttl: RELEASE_CACHE_TTL },
        );
      }

      return ok(
        UpdateCheckResultSchema.parse({
          latestVersion: latestRelease.version,
          currentVersion: runningVersion,
          hasUpdate: isNewer(latestRelease.version, runningVersion),
          releaseUrl: latestRelease.releaseUrl,
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "version check failed",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return err({ reason: "FETCH_FAILED" });
    }
  }

  return {
    check: (context) => resolve(context, false),
    refresh: (context) => resolve(context, true),
  };
}

async function fetchLatestReleaseFromGitHub(
  context: VersionContext,
): Promise<ApplicationRelease> {
  const headers: Record<string, string> = {
    "User-Agent": "flare-stack-blog",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const githubToken = serverEnv(context.env).GITHUB_TOKEN;
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    {
      headers,
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 500)}` : ""}`,
    );
  }

  const data = GitHubReleaseSchema.parse(await response.json());
  return {
    version: data.tag_name,
    releaseUrl: data.html_url,
  };
}

function isNewer(latest: string, current: string) {
  const latestParts = latest.slice(1).split(".").map(Number);
  const currentParts = current.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const lPart = latestParts[i] ?? 0;
    const cPart = currentParts[i] ?? 0;
    if (lPart > cPart) return true;
    if (lPart < cPart) return false;
  }
  return false;
}

export const versionChecker = createVersionChecker({
  getCurrentVersion: () => __APP_VERSION__,
  fetchLatestRelease: fetchLatestReleaseFromGitHub,
});
