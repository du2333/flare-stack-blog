import { afterEach, describe, expect, it, vi } from "vitest";
import { serverEnv } from "@/lib/env/server.env";
import {
  MAX_UPGRADE_LIST_ITEMS,
  MAX_UPGRADE_NAME_LENGTH,
  MAX_UPGRADE_TEXT_LENGTH,
  parseUpgradesFile,
} from "@/lib/version/upgrades";
import {
  createVersionChecker,
  fetchLatestReleaseFromReleasePage,
  readUpgradesFileFromUrl,
  UpdateSourceError,
  upgradesFileUrl,
  versionChecker,
} from "./service/version.service";
import { UpdateCheckResultSchema } from "./update-check.schema";
import { VERSION_CACHE_KEYS } from "./version.schema";

type VersionContext = BaseContext & { executionCtx: ExecutionContext };

const CACHE_KEY = VERSION_CACHE_KEYS.latestRelease.join(":");
const FAILURE_KEY = VERSION_CACHE_KEYS.recentFailure.join(":");

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

/** An upgrades file listing `versions`, given oldest first for readability. */
function upgradesFile(...versions: Array<string>) {
  return {
    versions: versions
      .map((version) => ({ version, summary: `Notes for ${version}.` }))
      .reverse(),
  };
}

function fileUnavailable() {
  return vi.fn(async () => {
    throw new UpdateSourceError("status", "upgrades file answered 404");
  });
}

function releasePageUnavailable() {
  return vi.fn(async (): Promise<ReturnType<typeof release>> => {
    throw new Error("GitHub release page did not redirect to a tag: 429");
  });
}

/** A checker that only the release page answers, as before the file existed. */
function releasePageChecker(currentVersion: string, latestVersion: string) {
  return createVersionChecker({
    getCurrentVersion: () => currentVersion,
    readUpgradesFile: fileUnavailable(),
    readLatestRelease: vi.fn(async () => release(latestVersion)),
  });
}

function loggedLines(spy: { mock: { calls: Array<Array<unknown>> } }) {
  return spy.mock.calls.map((call) => JSON.parse(String(call[0])));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("version checker: sources", () => {
  it("answers from the upgrades file with the notes since the running version", async () => {
    const { context } = createVersionContext();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const readLatestRelease = vi.fn(async () => release("v9.9.9"));
    const checker = createVersionChecker({
      getCurrentVersion: () => "3.11.0",
      readUpgradesFile: vi.fn(async () =>
        upgradesFile("3.10.0", "3.11.0", "3.11.1", "3.12.0"),
      ),
      readLatestRelease,
    });

    const result = await checker.refresh(context);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      latestVersion: "v3.12.0",
      currentVersion: "3.11.0",
      hasUpdate: true,
      releaseUrl:
        "https://github.com/du2333/flare-stack-blog/releases/tag/v3.12.0",
      level: "minor",
      entries: [
        { version: "3.11.1", summary: "Notes for 3.11.1." },
        { version: "3.12.0", summary: "Notes for 3.12.0." },
      ],
      notesAvailable: true,
      dismissed: false,
    });
    expect(readLatestRelease).not.toHaveBeenCalled();
    expect(loggedLines(log)).toEqual([
      { message: "version check fetched", source: "upstream-file" },
    ]);
  });

  it("falls back to the release page when the file fails; a major stays a major", async () => {
    const { context } = createVersionContext();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const checker = releasePageChecker("2.9.3", "v3.0.0");

    const result = await checker.refresh(context);

    expect(result.data).toEqual({
      latestVersion: "v3.0.0",
      currentVersion: "2.9.3",
      hasUpdate: true,
      releaseUrl: release("v3.0.0").releaseUrl,
      level: "major",
      entries: [],
      notesAvailable: false,
      dismissed: false,
    });
    expect(loggedLines(log)).toEqual([
      {
        message: "version check fetched",
        source: "release-page",
        fileRefused: "status",
      },
    ]);
  });

  it.each([
    [
      "valid JSON of the wrong shape",
      { versions: [{ version: "3.12.0" }] },
      "schema",
    ],
    ["a list in the wrong order", upgradesFile("3.12.0", "3.11.0"), "schema"],
    ["an empty list", { versions: [] }, "empty"],
    ["no JSON object at all", "not an object", "schema"],
  ])(
    "uses the release page when the file holds %s",
    async (_name, body, refusal) => {
      const { context } = createVersionContext();
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const checker = createVersionChecker({
        getCurrentVersion: () => "3.11.0",
        readUpgradesFile: vi.fn(async () => body),
        readLatestRelease: vi.fn(async () => release("v3.12.0")),
      });

      const result = await checker.refresh(context);

      expect(result.data).toMatchObject({
        latestVersion: "v3.12.0",
        level: "minor",
        notesAvailable: false,
        entries: [],
      });
      expect(loggedLines(log)).toEqual([
        {
          message: "version check fetched",
          source: "release-page",
          fileRefused: refusal,
        },
      ]);
    },
  );

  it("records a timeout of the file in a word", async () => {
    const { context } = createVersionContext();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const checker = createVersionChecker({
      getCurrentVersion: () => "3.11.0",
      readUpgradesFile: vi.fn(async () => {
        throw new DOMException("The operation timed out.", "TimeoutError");
      }),
      readLatestRelease: vi.fn(async () => release("v3.12.0")),
    });

    await checker.refresh(context);

    expect(loggedLines(log)[0]).toMatchObject({ fileRefused: "timeout" });
  });

  it("fails with FETCH_FAILED when both sources fail, and remembers it", async () => {
    const { context, values, flushBackgroundTasks } = createVersionContext();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const readUpgradesFile = fileUnavailable();
    const readLatestRelease = releasePageUnavailable();
    const checker = createVersionChecker({
      getCurrentVersion: () => "3.11.0",
      readUpgradesFile,
      readLatestRelease,
    });

    expect(await checker.check(context)).toEqual({
      data: null,
      error: { reason: "FETCH_FAILED" },
    });
    await flushBackgroundTasks();
    expect(values.get(FAILURE_KEY)).toBe("1");
    expect(loggedLines(error)[0].error).toMatch(/upgrades file: status/);

    expect((await checker.check(context)).error).toEqual({
      reason: "FETCH_FAILED",
    });
    expect(readUpgradesFile).toHaveBeenCalledOnce();
    expect(readLatestRelease).toHaveBeenCalledOnce();

    await checker.refresh(context);
    expect(readUpgradesFile).toHaveBeenCalledTimes(2);
    expect(readLatestRelease).toHaveBeenCalledTimes(2);
  });

  it("reports no update when the file lists nothing newer than the running version", async () => {
    const { context } = createVersionContext();
    const checker = createVersionChecker({
      getCurrentVersion: () => "3.13.0",
      readUpgradesFile: vi.fn(async () => upgradesFile("3.11.0", "3.12.0")),
      readLatestRelease: releasePageUnavailable(),
    });

    const result = await checker.refresh(context);

    expect(result.data).toMatchObject({
      latestVersion: "v3.12.0",
      currentVersion: "3.13.0",
      hasUpdate: false,
      level: null,
      entries: [],
      notesAvailable: true,
    });
  });

  it("carries every entry of a jump over several versions, oldest first", async () => {
    const { context } = createVersionContext();
    const versions = [
      "3.4.0",
      "3.5.0",
      "3.6.0",
      "3.7.0",
      "3.7.1",
      "3.8.0",
      "3.9.0",
      "3.10.0",
      "3.11.0",
      "3.12.0",
    ];
    const checker = createVersionChecker({
      getCurrentVersion: () => "3.5.0",
      readUpgradesFile: vi.fn(async () => upgradesFile(...versions)),
      readLatestRelease: releasePageUnavailable(),
    });

    const result = await checker.refresh(context);

    expect(result.data?.level).toBe("minor");
    expect(result.data?.entries.map((entry) => entry.version)).toEqual(
      versions.slice(2),
    );
  });

  it("carries the notes of a major with its before and after items", async () => {
    const { context } = createVersionContext();
    const major = {
      version: "4.0.0",
      summary: "A major.",
      before: [{ id: "secrets-as-secret", text: "Re-add the variables." }],
      after: [{ id: "build-command", text: "Change the build command." }],
      requires: { buildVars: [], secrets: ["BETTER_AUTH_URL"] },
      rollback: "unsafe",
      shout: "<b>unknown keys never reach the result</b>",
    };
    const checker = createVersionChecker({
      getCurrentVersion: () => "3.12.1",
      readUpgradesFile: vi.fn(async () => ({
        unreleased: { summary: "Not released yet." },
        versions: [major, { version: "3.12.1", summary: "A patch." }],
      })),
      readLatestRelease: releasePageUnavailable(),
    });

    const result = await checker.refresh(context);

    const { shout: _, ...expected } = major;
    expect(result.data).toMatchObject({ level: "major", notesAvailable: true });
    expect(result.data?.entries).toEqual([expected]);
  });

  it.each([
    ["3.13.0-beta.0", ["3.12.1", "3.13.0"], "v3.13.0", true, ["3.13.0"]],
    ["3.13.0-beta.0", ["3.12.1"], "v3.12.1", false, []],
    ["3.12.1-beta.2", ["3.12.0", "3.12.1"], "v3.12.1", true, ["3.12.1"]],
  ])(
    "answers for running prerelease %s",
    async (currentVersion, versions, latestVersion, hasUpdate, entries) => {
      const { context } = createVersionContext();
      const checker = createVersionChecker({
        getCurrentVersion: () => currentVersion,
        readUpgradesFile: vi.fn(async () => upgradesFile(...versions)),
        readLatestRelease: releasePageUnavailable(),
      });

      const result = await checker.refresh(context);

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        currentVersion,
        latestVersion,
        hasUpdate,
        level: hasUpdate ? "patch" : null,
      });
      expect(result.data?.entries.map((entry) => entry.version)).toEqual(
        entries,
      );
    },
  );
});

describe("version checker: the release page", () => {
  it.each([
    ["1.5.2", "v1.5.3", true, "patch"],
    ["1.5.2", "v2.0.0", true, "major"],
    ["1.5.2", "v1.5.2", false, null],
    ["1.5.2", "v1.4.9", false, null],
    ["3.13.0-beta.0", "v3.12.1", false, null],
    ["3.13.0-beta.0", "v3.13.0", true, "patch"],
    ["3.13.0-beta.0", "v3.13.1", true, "patch"],
    ["3.13.0-rc.1", "v3.12.9", false, null],
  ])(
    "compares running release %s with release %s",
    async (currentVersion, latestVersion, hasUpdate, level) => {
      const { context } = createVersionContext();

      const result = await releasePageChecker(
        currentVersion,
        latestVersion,
      ).refresh(context);

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        currentVersion,
        latestVersion,
        hasUpdate,
        level,
        notesAvailable: false,
      });
    },
  );

  it.each(["v1.5.3-beta.1", "1.5.3", "release-1.5.3"])(
    "rejects non-application release tag %s",
    async (latestVersion) => {
      const { context } = createVersionContext();

      const result = await releasePageChecker("1.5.2", latestVersion).refresh(
        context,
      );

      expect(result).toEqual({
        data: null,
        error: { reason: "FETCH_FAILED" },
      });
    },
  );

  it.each(["v1.5.2", "1.5", "1.5.2+build.1", "1.5.2-", "01.5.2"])(
    "rejects malformed running version %s",
    async (currentVersion) => {
      const { context } = createVersionContext();

      const result = await releasePageChecker(currentVersion, "v1.5.3").refresh(
        context,
      );

      expect(result).toEqual({
        data: null,
        error: { reason: "FETCH_FAILED" },
      });
    },
  );
});

describe("version checker: cache", () => {
  it("recomputes the answer after a deployment without refetching", async () => {
    const { context, flushBackgroundTasks } = createVersionContext();
    const readUpgradesFile = vi.fn(async () =>
      upgradesFile("3.10.0", "3.11.0", "3.12.0"),
    );
    const oldDeployment = createVersionChecker({
      getCurrentVersion: () => "3.10.0",
      readUpgradesFile,
      readLatestRelease: releasePageUnavailable(),
    });

    const oldResult = await oldDeployment.check(context);
    await flushBackgroundTasks();
    expect(oldResult.data?.entries.map((entry) => entry.version)).toEqual([
      "3.11.0",
      "3.12.0",
    ]);

    const failing = vi.fn(async () => {
      throw new Error("cache should be reused");
    });
    const newDeployment = createVersionChecker({
      getCurrentVersion: () => "3.11.0",
      readUpgradesFile: failing,
      readLatestRelease: failing,
    });

    const newResult = await newDeployment.check(context);

    expect(newResult.data).toMatchObject({
      currentVersion: "3.11.0",
      latestVersion: "v3.12.0",
      hasUpdate: true,
      level: "minor",
      notesAvailable: true,
    });
    expect(newResult.data?.entries.map((entry) => entry.version)).toEqual([
      "3.12.0",
    ]);
    await expect(newDeployment.cached(context)).resolves.toEqual(
      newResult.data,
    );
    expect(readUpgradesFile).toHaveBeenCalledOnce();
    expect(failing).not.toHaveBeenCalled();
  });

  it("keeps only the entries newer than the running version", async () => {
    const { context, values, flushBackgroundTasks } = createVersionContext();
    const checker = createVersionChecker({
      getCurrentVersion: () => "3.11.0",
      readUpgradesFile: vi.fn(async () =>
        upgradesFile("3.9.0", "3.10.0", "3.11.0", "3.12.0"),
      ),
      readLatestRelease: releasePageUnavailable(),
    });

    await checker.check(context);
    await flushBackgroundTasks();

    expect(JSON.parse(values.get(CACHE_KEY) ?? "")).toEqual({
      latestVersion: "v3.12.0",
      releaseUrl:
        "https://github.com/du2333/flare-stack-blog/releases/tag/v3.12.0",
      notesAvailable: true,
      notesSince: "3.11.0",
      entries: [{ version: "3.12.0", summary: "Notes for 3.12.0." }],
    });
  });

  it.each([
    ["the file", vi.fn(async () => upgradesFile("3.12.0")), 6 * 60 * 60],
    ["the release page", fileUnavailable(), 30 * 60],
  ])(
    "stores an answer from %s for its own lifetime; refresh bypasses it",
    async (_source, readUpgradesFile, expirationTtl) => {
      const { context, flushBackgroundTasks } = createVersionContext();
      readUpgradesFile.mockClear();
      const readLatestRelease = vi.fn(async () => release("v3.12.0"));
      const checker = createVersionChecker({
        getCurrentVersion: () => "3.11.0",
        readUpgradesFile,
        readLatestRelease,
      });

      await checker.check(context);
      await flushBackgroundTasks();
      expect(context.env.KV.put).toHaveBeenCalledWith(
        CACHE_KEY,
        expect.any(String),
        { expirationTtl },
      );

      await checker.check(context);
      expect(readUpgradesFile).toHaveBeenCalledOnce();

      await checker.refresh(context);
      expect(readUpgradesFile).toHaveBeenCalledTimes(2);
    },
  );

  it("refetches when the running version is older than the cached notes", async () => {
    const { context, flushBackgroundTasks } = createVersionContext();
    const file = upgradesFile("3.10.0", "3.11.0", "3.12.0");
    await createVersionChecker({
      getCurrentVersion: () => "3.11.0",
      readUpgradesFile: vi.fn(async () => file),
      readLatestRelease: releasePageUnavailable(),
    }).check(context);
    await flushBackgroundTasks();

    const readUpgradesFile = vi.fn(async () => file);
    const rolledBack = createVersionChecker({
      getCurrentVersion: () => "3.10.0",
      readUpgradesFile,
      readLatestRelease: releasePageUnavailable(),
    });

    await expect(rolledBack.cached(context)).resolves.toBeNull();
    const result = await rolledBack.check(context);
    expect(result.data?.entries.map((entry) => entry.version)).toEqual([
      "3.11.0",
      "3.12.0",
    ]);
    expect(readUpgradesFile).toHaveBeenCalledOnce();
  });

  it("refreshes and replaces the cache", async () => {
    const { context, values, flushBackgroundTasks } = createVersionContext();
    const readUpgradesFile = vi
      .fn()
      .mockResolvedValueOnce(upgradesFile("1.5.2", "1.5.3"))
      .mockResolvedValueOnce(upgradesFile("1.5.2", "1.5.3", "1.6.0"));
    const checker = createVersionChecker({
      getCurrentVersion: () => "1.5.2",
      readUpgradesFile,
      readLatestRelease: releasePageUnavailable(),
    });

    await checker.check(context);
    await flushBackgroundTasks();
    expect((await checker.check(context)).data?.latestVersion).toBe("v1.5.3");

    const result = await checker.refresh(context);
    await flushBackgroundTasks();

    expect(result.data).toMatchObject({
      latestVersion: "v1.6.0",
      hasUpdate: true,
    });
    expect(readUpgradesFile).toHaveBeenCalledTimes(2);
    expect(JSON.parse(values.get(CACHE_KEY) ?? "").latestVersion).toBe(
      "v1.6.0",
    );
  });

  it("reads the cache without fetching", async () => {
    const { context, values } = createVersionContext();
    const readUpgradesFile = vi.fn(async () => upgradesFile("1.6.0"));
    const checker = createVersionChecker({
      getCurrentVersion: () => "1.5.2",
      readUpgradesFile,
      readLatestRelease: releasePageUnavailable(),
    });

    expect(await checker.cached(context)).toBeNull();

    values.set(
      CACHE_KEY,
      JSON.stringify({
        ...release("v1.5.3"),
        latestVersion: "v1.5.3",
        notesAvailable: false,
        notesSince: "1.5.0",
        entries: [],
      }),
    );
    expect(await checker.cached(context)).toMatchObject({
      latestVersion: "v1.5.3",
      currentVersion: "1.5.2",
      hasUpdate: true,
      level: "patch",
      notesAvailable: false,
    });

    values.set(CACHE_KEY, "not json");
    expect(await checker.cached(context)).toBeNull();
    expect(readUpgradesFile).not.toHaveBeenCalled();
  });

  it("reads an old-format cached value as no cache", async () => {
    const { context, values, flushBackgroundTasks } = createVersionContext();
    values.set(CACHE_KEY, JSON.stringify(release("v1.5.3")));
    const readUpgradesFile = vi.fn(async () => upgradesFile("1.5.2", "1.6.0"));
    const checker = createVersionChecker({
      getCurrentVersion: () => "1.5.2",
      readUpgradesFile,
      readLatestRelease: releasePageUnavailable(),
    });

    expect(await checker.cached(context)).toBeNull();
    const result = await checker.check(context);
    await flushBackgroundTasks();

    expect(result.data).toMatchObject({
      latestVersion: "v1.6.0",
      notesAvailable: true,
    });
    expect(readUpgradesFile).toHaveBeenCalledOnce();
    expect(JSON.parse(values.get(CACHE_KEY) ?? "")).toMatchObject({
      latestVersion: "v1.6.0",
      notesSince: "1.5.2",
    });
  });
});

describe("upgradesFileUrl", () => {
  const UPSTREAM =
    "https://raw.githubusercontent.com/du2333/flare-stack-blog/main/upgrades.json";

  it("defaults to upstream main", () => {
    expect(upgradesFileUrl(undefined)).toBe(UPSTREAM);
    expect(upgradesFileUrl("")).toBe(UPSTREAM);
  });

  it("takes an https URL", () => {
    expect(upgradesFileUrl("https://example.test/branch/upgrades.json")).toBe(
      "https://example.test/branch/upgrades.json",
    );
  });

  it.each([
    "http://example.test/upgrades.json",
    "not a url",
    "file:///x.json",
    "https://user:secret@example.test/upgrades.json",
    "https://token@example.test/upgrades.json",
  ])("ignores %s with a warning that does not repeat it", (configured) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(upgradesFileUrl(configured)).toBe(UPSTREAM);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).not.toContain(configured);
    expect(String(warn.mock.calls[0][0])).not.toContain("secret");
  });
});

/** A response as `fetch` returns it: with the address it finally came from. */
function servedFrom(url: string, response: Response) {
  Object.defineProperty(response, "url", { value: url });
  return response;
}

describe("readUpgradesFileFromUrl", () => {
  const FILE_URL = "https://example.test/upgrades.json";

  async function refusalOf(response: Response, url = FILE_URL) {
    const fetcher = vi.fn(async () => servedFrom(url, response));
    const error = await readUpgradesFileFromUrl(FILE_URL, fetcher).catch(
      (e: unknown) => e,
    );
    return error instanceof UpdateSourceError ? error.refusal : error;
  }

  it("returns the parsed JSON", async () => {
    const body = upgradesFile("3.12.0");
    const fetcher = vi.fn(async () =>
      servedFrom(FILE_URL, Response.json(body)),
    );

    await expect(readUpgradesFileFromUrl(FILE_URL, fetcher)).resolves.toEqual(
      body,
    );
    expect(fetcher).toHaveBeenCalledWith(
      FILE_URL,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("follows a redirect that stays on https", async () => {
    const body = upgradesFile("3.12.0");
    const fetcher = vi.fn(async () =>
      servedFrom("https://elsewhere.test/upgrades.json", Response.json(body)),
    );

    await expect(readUpgradesFileFromUrl(FILE_URL, fetcher)).resolves.toEqual(
      body,
    );
  });

  it("refuses a body served from outside https after a redirect", async () => {
    expect(
      await refusalOf(
        Response.json(upgradesFile("3.12.0")),
        "http://elsewhere.test/upgrades.json",
      ),
    ).toBe("insecure-redirect");
  });

  it("refuses a non-2xx status", async () => {
    expect(await refusalOf(new Response("Not Found", { status: 404 }))).toBe(
      "status",
    );
  });

  it("refuses a body that is not JSON", async () => {
    expect(await refusalOf(new Response("<html>"))).toBe("json");
  });

  it("refuses a body that is not UTF-8", async () => {
    const bytes = new TextEncoder().encode('{"versions":[],"x":"__"}');
    bytes.set([0xff, 0xfe], bytes.length - 4);
    expect(await refusalOf(new Response(bytes))).toBe("encoding");
  });

  it("refuses a declared size over the cap", async () => {
    expect(
      await refusalOf(
        new Response("{}", { headers: { "content-length": "10000000" } }),
      ),
    ).toBe("size");
  });

  it("stops reading a body that grows past the cap", async () => {
    const chunk = new Uint8Array(64 * 1024).fill(0x20);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        if (sent > 100) controller.close();
        else controller.enqueue(chunk);
      },
    });

    expect(await refusalOf(new Response(body))).toBe("size");
    expect(sent).toBeLessThan(20);
  });
});

describe("fetchLatestReleaseFromReleasePage", () => {
  const RELEASE_PAGE =
    "https://github.com/du2333/flare-stack-blog/releases/latest";

  function redirectTo(location: string) {
    return vi.fn(
      async () => new Response(null, { status: 302, headers: { location } }),
    );
  }

  it.each([
    "https://github.com/du2333/flare-stack-blog/releases/tag/v3.1.2",
    "/du2333/flare-stack-blog/releases/tag/v3.1.2",
  ])("reads the latest tag from a redirect to %s", async (location) => {
    const fetcher = redirectTo(location);

    await expect(fetchLatestReleaseFromReleasePage(fetcher)).resolves.toEqual(
      release("v3.1.2"),
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      RELEASE_PAGE,
      expect.objectContaining({ method: "HEAD", redirect: "manual" }),
    );
  });

  it.each([
    "http://github.com/du2333/flare-stack-blog/releases/tag/v3.1.2",
    "https://github.com.evil.test/du2333/flare-stack-blog/releases/tag/v3.1.2",
    "https://evil.test/du2333/flare-stack-blog/releases/tag/v3.1.2",
    "//evil.test/du2333/flare-stack-blog/releases/tag/v3.1.2",
    "https://github.com/someone/else/releases/tag/v3.1.2",
    "https://github.com/du2333/flare-stack-blog/releases/tag/v3.1.2/x",
    "https://github.com/du2333/flare-stack-blog/releases/tag/nightly",
    "javascript:alert(1)",
  ])("refuses a redirect to %s", async (location) => {
    await expect(
      fetchLatestReleaseFromReleasePage(redirectTo(location)),
    ).rejects.toThrow(/did not redirect to a release tag/);
  });

  it("rebuilds the address, dropping a query or credentials", async () => {
    await expect(
      fetchLatestReleaseFromReleasePage(
        redirectTo(
          "https://u:p@github.com/du2333/flare-stack-blog/releases/tag/v3.1.2?x=1#y",
        ),
      ),
    ).resolves.toEqual(release("v3.1.2"));
  });

  it("fails when the release page does not redirect", async () => {
    await expect(
      fetchLatestReleaseFromReleasePage(
        vi.fn(async () => new Response("", { status: 429 })),
      ),
    ).rejects.toThrow();
  });
});

describe("the result's entry schema", () => {
  // The result restates the reader's entry by hand (update-check.schema.ts);
  // this test holds the two together. A field the reader gains goes here too.
  it("keeps every field of a maximal entry the reader accepts", () => {
    const text = (seed: string) =>
      seed.repeat(MAX_UPGRADE_TEXT_LENGTH).slice(0, MAX_UPGRADE_TEXT_LENGTH);
    const id = (n: number) => `item-${n}-`.padEnd(MAX_UPGRADE_NAME_LENGTH, "a");
    const name = (n: number) =>
      `VAR_${n}_`.padEnd(MAX_UPGRADE_NAME_LENGTH, "A");
    const items = (seed: string) =>
      Array.from({ length: MAX_UPGRADE_LIST_ITEMS }, (_, n) => ({
        id: id(n),
        text: text(seed),
      }));
    const names = Array.from({ length: MAX_UPGRADE_LIST_ITEMS }, (_, n) =>
      name(n),
    );
    const entry = {
      version: "4.0.0",
      summary: text("摘要"),
      before: items("前"),
      after: items("后"),
      requires: { buildVars: names, secrets: names },
      rollback: "unsafe",
    };

    const file = parseUpgradesFile({ versions: [entry] });
    expect(file?.versions).toEqual([entry]);

    const result = UpdateCheckResultSchema.parse({
      latestVersion: "v4.0.0",
      currentVersion: "3.12.1",
      hasUpdate: true,
      releaseUrl: release("v4.0.0").releaseUrl,
      level: "major",
      entries: file?.versions,
      notesAvailable: true,
      dismissed: false,
    });
    expect(result.entries).toEqual(file?.versions);
  });
});

describe("the deployed checker", () => {
  it("runs with a leftover GITHUB_TOKEN in the environment", async () => {
    const { context, flushBackgroundTasks } = createVersionContext();
    Object.assign(context.env, {
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "https://blog.example.test",
      GITHUB_CLIENT_ID: "id",
      GITHUB_CLIENT_SECRET: "secret",
      DOMAIN: "blog.example.test",
      GITHUB_TOKEN: "leftover-token",
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetch = vi.fn(async (url: string) =>
      servedFrom(url, Response.json(upgradesFile("99.0.0"))),
    );
    vi.stubGlobal("fetch", fetch);

    expect(serverEnv(context.env)).not.toHaveProperty("GITHUB_TOKEN");
    const result = await versionChecker.refresh(context);
    await flushBackgroundTasks();

    expect(result.data).toMatchObject({
      latestVersion: "v99.0.0",
      level: "major",
      notesAvailable: true,
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/du2333/flare-stack-blog/main/upgrades.json",
      expect.anything(),
    );
  });
});
