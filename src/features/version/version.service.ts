import {
  GitHubReleaseSchema,
  UpdateCheckResultSchema,
  VERSION_CACHE_KEYS,
} from "./version.schema";
import type { UpdateCheckResult } from "./version.schema";
import type { Result } from "@/lib/error";
import { err, ok } from "@/lib/error";
import * as CacheService from "@/features/cache/cache.service";

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
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          "User-Agent": "flare-stack-blog",
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
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
          { ttl: "1h" },
        ),
      );
    } else {
      data = await CacheService.get(
        context,
        VERSION_CACHE_KEYS.updateCheck,
        UpdateCheckResultSchema,
        fetcher,
        { ttl: "1h" },
      );
    }

    return ok(data);
  } catch (error) {
    console.error("[VersionService] Failed to check for update:", error);
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
