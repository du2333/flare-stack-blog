import * as CacheService from "@/features/cache/cache.service";
import type { UpdateCheckResult } from "@/features/version/version.schema";
import {
  GitHubReleaseSchema,
  UpdateCheckResultSchema,
  VERSION_CACHE_KEYS,
} from "@/features/version/version.schema";
import { serverEnv } from "@/lib/env/server.env";
import type { Result } from "@/lib/errors";
import { err, ok } from "@/lib/errors";

const GITHUB_REPO = "du2333/flare-stack-blog";

type CheckForUpdateResult = Result<
  UpdateCheckResult,
  { reason: "FETCH_FAILED" }
>;

/**
 * 检查版本更新
 * @param context
 * @param force 是否强制跳过缓存直接检查
 */
export async function checkForUpdate(
  context: BaseContext & { executionCtx: ExecutionContext },
  force = false,
): Promise<CheckForUpdateResult> {
  const fetcher = async () => {
    const headers: Record<string, string> = {
      "User-Agent": "flare-stack-blog",
      Accept: "application/vnd.github.v3+json",
    };

    const githubToken = serverEnv(context.env).GITHUB_TOKEN;
    if (githubToken) {
      headers.Authorization = `Bearer ${githubToken}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 500)}` : ""}`,
      );
    }

    const json = await response.json();
    const data = GitHubReleaseSchema.parse(json);
    const latestVersion = data.tag_name; // 比如 "v0.6.0"
    const currentVersion = __APP_VERSION__;

    return {
      latestVersion,
      currentVersion,
      hasUpdate: isNewer(latestVersion, currentVersion),
      releaseUrl: data.html_url,
      publishedAt: data.published_at,
      checkedAt: Date.now(),
    };
  };

  try {
    let data: UpdateCheckResult;

    if (force) {
      data = await fetcher();
      context.executionCtx.waitUntil(
        CacheService.set(
          context,
          VERSION_CACHE_KEYS.updateCheck,
          JSON.stringify(data),
          { ttl: "5m" },
        ),
      );
    } else {
      data = await CacheService.get(
        context,
        VERSION_CACHE_KEYS.updateCheck,
        UpdateCheckResultSchema,
        fetcher,
        { ttl: "5m" },
      );
    }

    return ok(data);
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

function isNewer(latest: string, current: string) {
  const l = latest
    .replace(/^v/, "")
    .split(".")
    .map((v) => parseInt(v, 10) || 0);
  const c = current
    .replace(/^v/, "")
    .split(".")
    .map((v) => parseInt(v, 10) || 0);

  // 长度补齐
  const length = Math.max(l.length, c.length);
  for (let i = 0; i < length; i++) {
    const lPart = l[i] || 0;
    const cPart = c[i] || 0;
    if (lPart > cPart) return true;
    if (lPart < cPart) return false;
  }
  return false;
}
