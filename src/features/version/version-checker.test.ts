import { describe, expect, it, vi } from "vitest";
import { createVersionChecker } from "./service/version.service";
import { VERSION_CACHE_KEYS } from "./version.schema";

type VersionContext = BaseContext & { executionCtx: ExecutionContext };

function createVersionContext() {
  const values = new Map<string, string>();
  const backgroundTasks: Array<Promise<unknown>> = [];

  const context = {
    env: {
      KV: {
        get: vi.fn(async (key: string, type?: string) => {
          const value = values.get(key) ?? null;
          if (value === null || type !== "json") return value;
          return JSON.parse(value);
        }),
        put: vi.fn(async (key: string, value: string) => {
          values.set(key, value);
        }),
      },
    },
    executionCtx: {
      waitUntil(task: Promise<unknown>) {
        backgroundTasks.push(task);
      },
    },
  } as unknown as VersionContext;

  return {
    context,
    values,
    async flushBackgroundTasks() {
      await Promise.all(backgroundTasks);
    },
  };
}

function release(version: string) {
  return {
    version,
    releaseUrl: `https://github.com/du2333/flare-stack-blog/releases/tag/${version}`,
  };
}

describe("version checker", () => {
  it.each([
    ["1.5.2", "v1.5.3", true],
    ["1.5.2", "v2.0.0", true],
    ["1.5.2", "v1.5.2", false],
    ["1.5.2", "v1.4.9", false],
  ])(
    "compares running release %s with application release %s",
    async (currentVersion, latestVersion, hasUpdate) => {
      const { context } = createVersionContext();
      const checker = createVersionChecker({
        getCurrentVersion: () => currentVersion,
        fetchLatestRelease: vi.fn(async () => release(latestVersion)),
      });

      const result = await checker.refresh(context);

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        currentVersion,
        latestVersion,
        hasUpdate,
      });
    },
  );

  it.each(["v1.5.3-beta.1", "1.5.3", "release-1.5.3"])(
    "rejects non-application release tag %s",
    async (latestVersion) => {
      const { context } = createVersionContext();
      const checker = createVersionChecker({
        getCurrentVersion: () => "1.5.2",
        fetchLatestRelease: vi.fn(async () => release(latestVersion)),
      });

      const result = await checker.refresh(context);

      expect(result).toEqual({
        data: null,
        error: { reason: "FETCH_FAILED" },
      });
    },
  );

  it("rejects a non-stable running release", async () => {
    const { context } = createVersionContext();
    const checker = createVersionChecker({
      getCurrentVersion: () => "1.5.2-beta.1",
      fetchLatestRelease: vi.fn(async () => release("v1.5.3")),
    });

    const result = await checker.refresh(context);

    expect(result).toEqual({
      data: null,
      error: { reason: "FETCH_FAILED" },
    });
  });

  it("caches only the application release and recomputes status after deployment", async () => {
    const { context, values, flushBackgroundTasks } = createVersionContext();
    const fetchLatestRelease = vi.fn(async () => release("v1.5.3"));
    const oldDeployment = createVersionChecker({
      getCurrentVersion: () => "1.5.2",
      fetchLatestRelease,
    });

    const oldResult = await oldDeployment.check(context);
    await flushBackgroundTasks();

    expect(oldResult.data?.hasUpdate).toBe(true);
    expect(
      JSON.parse(values.get(VERSION_CACHE_KEYS.latestRelease.join(":")) ?? ""),
    ).toEqual(release("v1.5.3"));

    const newDeployment = createVersionChecker({
      getCurrentVersion: () => "1.5.3",
      fetchLatestRelease: vi.fn(async () => {
        throw new Error("cache should be reused");
      }),
    });

    const newResult = await newDeployment.check(context);

    expect(newResult.data).toMatchObject({
      currentVersion: "1.5.3",
      latestVersion: "v1.5.3",
      hasUpdate: false,
    });
    expect(fetchLatestRelease).toHaveBeenCalledOnce();
  });

  it("refreshes the application release and replaces the cache", async () => {
    const { context, values, flushBackgroundTasks } = createVersionContext();
    values.set(
      VERSION_CACHE_KEYS.latestRelease.join(":"),
      JSON.stringify(release("v1.5.3")),
    );
    const fetchLatestRelease = vi.fn(async () => release("v1.6.0"));
    const checker = createVersionChecker({
      getCurrentVersion: () => "1.5.2",
      fetchLatestRelease,
    });

    const result = await checker.refresh(context);
    await flushBackgroundTasks();

    expect(result.data).toMatchObject({
      latestVersion: "v1.6.0",
      hasUpdate: true,
    });
    expect(fetchLatestRelease).toHaveBeenCalledOnce();
    expect(
      JSON.parse(values.get(VERSION_CACHE_KEYS.latestRelease.join(":")) ?? ""),
    ).toEqual(release("v1.6.0"));
  });
});
