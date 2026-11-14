import { describe, expect, it, vi } from "vitest";
import {
  dismissUpdate,
  readDismissedVersion,
  withDismissal,
} from "./service/dismissed-update.service";
import { createVersionChecker } from "./service/version.service";
import type { UpdateCheckResult } from "./update-check.schema";
import { DISMISSED_UPDATE_KEY } from "./update-check.schema";

type Context = BaseContext & { executionCtx: ExecutionContext };

const KEY = DISMISSED_UPDATE_KEY.join(":");

function createContext(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const tasks: Array<Promise<unknown>> = [];
  const context = {
    env: {
      KV: {
        get: vi.fn(async (key: string) => values.get(key) ?? null),
        put: vi.fn(async (key: string, value: string) => {
          values.set(key, value);
        }),
        delete: vi.fn(async (key: string) => {
          values.delete(key);
        }),
      },
    },
    executionCtx: { waitUntil: (task: Promise<unknown>) => tasks.push(task) },
  } as unknown as Context;
  return { context, values, flush: () => Promise.all(tasks) };
}

function result(change: Partial<UpdateCheckResult>): UpdateCheckResult {
  return {
    latestVersion: "v3.14.0",
    currentVersion: "3.12.1",
    hasUpdate: true,
    releaseUrl: "https://example.com/r",
    level: "minor",
    entries: [],
    notesAvailable: true,
    dismissed: false,
    ...change,
  };
}

const answering = (latest: UpdateCheckResult) =>
  vi.fn(async () => ({ data: latest, error: null }) as const);

describe("the dismissed version", () => {
  it("is dismissed while the latest version is the one recorded", async () => {
    const { context } = createContext({ [KEY]: "v3.14.0" });
    expect((await withDismissal(context, result({}))).dismissed).toBe(true);
  });

  it("is not dismissed once the latest version moves on", async () => {
    const { context } = createContext({ [KEY]: "v3.14.0" });
    expect(
      (await withDismissal(context, result({ latestVersion: "v3.15.0" })))
        .dismissed,
    ).toBe(false);
  });

  it("is never dismissed without an update", async () => {
    const { context } = createContext({ [KEY]: "v3.12.1" });
    expect(
      (
        await withDismissal(
          context,
          result({ latestVersion: "v3.12.1", hasUpdate: false, level: null }),
        )
      ).dismissed,
    ).toBe(false);
  });

  it("reads an invalid stored value as not dismissed", async () => {
    for (const stored of ["garbage", "3.14.0", "v3.14", "", "v3.14.0-beta.1"]) {
      const { context } = createContext({ [KEY]: stored });
      expect(await readDismissedVersion(context)).toBeNull();
      expect((await withDismissal(context, result({}))).dismissed).toBe(false);
    }
  });
});

describe("dismissUpdate", () => {
  it("records the latest version, with no expiry", async () => {
    const { context, values } = createContext();
    const outcome = await dismissUpdate(
      context,
      "v3.14.0",
      answering(result({})),
    );
    expect(outcome).toEqual({ data: { success: true }, error: null });
    expect(values.get(KEY)).toBe("v3.14.0");
    expect(context.env.KV.put).toHaveBeenCalledWith(KEY, "v3.14.0");
  });

  it("refuses a version that is not the latest, and writes nothing", async () => {
    const { context, values } = createContext();
    const outcome = await dismissUpdate(
      context,
      "v3.13.0",
      answering(result({})),
    );
    expect(outcome.error).toEqual({ reason: "NOT_LATEST" });
    expect(values.has(KEY)).toBe(false);
  });

  it("refuses a version when there is no update", async () => {
    const { context, values } = createContext();
    const outcome = await dismissUpdate(
      context,
      "v3.12.1",
      answering(
        result({ latestVersion: "v3.12.1", hasUpdate: false, level: null }),
      ),
    );
    expect(outcome.error).toEqual({ reason: "NOT_LATEST" });
    expect(values.has(KEY)).toBe(false);
  });

  it("fails when the check cannot say what the latest version is", async () => {
    const { context, values } = createContext();
    const outcome = await dismissUpdate(context, "v3.14.0", async () => ({
      data: null,
      error: { reason: "FETCH_FAILED" as const },
    }));
    expect(outcome.error).toEqual({ reason: "FETCH_FAILED" });
    expect(values.has(KEY)).toBe(false);
  });

  it("restores with null, without asking the check", async () => {
    const { context, values } = createContext({ [KEY]: "v3.14.0" });
    const check = vi.fn();
    const outcome = await dismissUpdate(context, null, check);
    expect(outcome).toEqual({ data: { success: true }, error: null });
    expect(values.has(KEY)).toBe(false);
    expect(check).not.toHaveBeenCalled();
  });

  it("lets a failed write fail instead of reporting success", async () => {
    const { context } = createContext();
    vi.mocked(context.env.KV.put).mockRejectedValue(new Error("KV down"));
    await expect(
      dismissUpdate(context, "v3.14.0", answering(result({}))),
    ).rejects.toThrow("KV down");
  });
});

describe("the checker's answer", () => {
  const checker = () =>
    createVersionChecker({
      getCurrentVersion: () => "3.12.1",
      readUpgradesFile: async () => ({
        versions: [{ version: "3.14.0", summary: "A summary" }],
      }),
      readLatestRelease: async () => {
        throw new Error("not used");
      },
    });

  it("carries dismissed from KV on check and refresh, and not on the cache read", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { context, flush } = createContext({ [KEY]: "v3.14.0" });
    const subject = checker();

    expect((await subject.refresh(context)).data?.dismissed).toBe(true);
    await flush();
    expect((await subject.check(context)).data?.dismissed).toBe(true);
    // The dashboard reads the cache: the release data has no record in it.
    expect((await subject.cached(context))?.dismissed).toBe(false);

    await context.env.KV.delete(KEY);
    expect((await subject.check(context)).data?.dismissed).toBe(false);
  });
});
