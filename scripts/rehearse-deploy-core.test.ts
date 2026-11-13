import { describe, expect, it } from "vitest";
import {
  cfBuildsCreateArgs,
  cfBuildsGetArgs,
  classifyBuild,
  confirmForkBranch,
  parseBuildStart,
  parseFlatToml,
  pollBuild,
  pushArgs,
  refApiPath,
  rehearse,
  resolveSettings,
  type Deps,
  type Limits,
  type Settings,
} from "./rehearse-deploy-core.ts";

// The `cf builds get` outputs below follow the Workers Builds API's documented
// response shape. They are written from the docs, not recorded from a real
// build: the first real run is what confirms the shape cf prints.
const SHA = "0123456789abcdef0123456789abcdef01234567";
const running = JSON.stringify({
  success: true,
  result: { build_uuid: "b-1", status: "running", build_outcome: null },
});
const queued = JSON.stringify({
  result: { build_uuid: "b-1", status: "queued" },
});
const stoppedSuccess = JSON.stringify({
  success: true,
  result: {
    build_uuid: "b-1",
    status: "stopped",
    build_outcome: "success",
    build_trigger_metadata: { branch: "rehearsal", commit_hash: SHA },
  },
});
const stoppedFailure = JSON.stringify({
  success: true,
  result: {
    build_uuid: "b-1",
    status: "stopped",
    build_outcome: "fail",
    build_trigger_metadata: { branch: "rehearsal", commit_hash: SHA },
  },
});
const unparsable = "error: something went wrong <html>";

const settings: Settings = {
  fork: "someone/blog",
  worker: "worker-tag",
  accountId: "acct",
  siteUrl: "https://rehearsal.example.test/",
  branch: "rehearsal",
  remote: "https://github.com/someone/blog.git",
};

describe("settings", () => {
  const env = {
    REHEARSAL_FORK: "someone/blog",
    REHEARSAL_WORKER: "worker-tag",
    REHEARSAL_ACCOUNT_ID: "acct",
    REHEARSAL_SITE_URL: "https://rehearsal.example.test/",
  };

  it("reads everything from environment variables", () => {
    expect(resolveSettings(env, {})).toEqual({
      settings: {
        ...settings,
        remote: "https://github.com/someone/blog.git",
        profile: undefined,
      },
    });
  });

  it("reads the config file, and an environment variable wins over it", () => {
    const file = parseFlatToml(
      '# rehearsal\nfork = "file/repo"\nworker = "w"\naccount_id = "a"\nsite_url = "https://s.test/" # the site\nbranch = "try-it"\nprofile = "work"\n',
    );
    const result = resolveSettings({ REHEARSAL_FORK: "env/repo" }, file);
    expect(result).toMatchObject({
      settings: {
        fork: "env/repo",
        worker: "w",
        accountId: "a",
        branch: "try-it",
        profile: "work",
      },
    });
  });

  it("takes CLOUDFLARE_ACCOUNT_ID when no rehearsal account id is set", () => {
    const { REHEARSAL_ACCOUNT_ID: _, ...rest } = env;
    expect(
      resolveSettings({ ...rest, CLOUDFLARE_ACCOUNT_ID: "from-cf" }, {}),
    ).toMatchObject({
      settings: { accountId: "from-cf" },
    });
  });

  it("names every missing setting and where to put it", () => {
    const result = resolveSettings({}, {});
    expect("problems" in result && result.problems).toHaveLength(4);
    const text = "problems" in result ? result.problems.join("\n") : "";
    expect(text).toMatch(/REHEARSAL_FORK .*rehearsal\.toml/);
    expect(text).toMatch(/REHEARSAL_ACCOUNT_ID/);
    expect(text).toMatch(/several accounts/);
  });

  it("rejects a malformed fork, a non-http site and the blog's own branches", () => {
    const result = resolveSettings(
      {
        ...env,
        REHEARSAL_FORK: "not-a-repo",
        REHEARSAL_SITE_URL: "example.test",
        REHEARSAL_BRANCH: "main",
      },
      {},
    );
    expect("problems" in result && result.problems).toHaveLength(3);
  });

  it("rejects a config line that is not key = value", () => {
    expect(() => parseFlatToml("fork someone/blog")).toThrow(/line 1/);
  });
});

describe("commands", () => {
  it("builds the push, the API path and the cf commands from the settings", () => {
    expect(pushArgs(settings, SHA)).toEqual([
      "git",
      "push",
      "--force",
      settings.remote,
      `${SHA}:refs/heads/rehearsal`,
    ]);
    expect(refApiPath(settings)).toBe(
      "repos/someone/blog/git/ref/heads/rehearsal",
    );
    expect(refApiPath({ ...settings, branch: "try/it now" })).toBe(
      "repos/someone/blog/git/ref/heads/try/it%20now",
    );
    expect(cfBuildsCreateArgs(settings)).toEqual([
      "bunx",
      "cf",
      "builds",
      "create",
      "worker-tag",
      "--branch",
      "rehearsal",
    ]);
    expect(cfBuildsGetArgs({ ...settings, profile: "work" }, "b-1")).toEqual([
      "bunx",
      "cf",
      "builds",
      "get",
      "b-1",
      "--profile",
      "work",
    ]);
  });
});

describe("confirmForkBranch", () => {
  it("passes when the fork's branch is exactly the commit", async () => {
    await expect(
      confirmForkBranch(settings, SHA, async () => SHA),
    ).resolves.toBeUndefined();
  });

  it("stops when it points anywhere else", async () => {
    await expect(
      confirmForkBranch(settings, SHA, async () => "f".repeat(40)),
    ).rejects.toThrow(/did not land; no build was started/);
  });
});

describe("classifyBuild", () => {
  it("reads a build that has not stopped", () => {
    expect(classifyBuild(running)).toEqual({
      kind: "running",
      status: "running",
    });
    expect(classifyBuild(queued)).toEqual({
      kind: "running",
      status: "queued",
    });
  });

  it("reads stopped plus success", () => {
    expect(classifyBuild(stoppedSuccess)).toEqual({
      kind: "success",
      commit: SHA,
    });
  });

  it("reads stopped plus any other outcome as a failure that names it", () => {
    expect(classifyBuild(stoppedFailure)).toEqual({
      kind: "failure",
      outcome: "fail",
    });
    expect(
      classifyBuild(
        JSON.stringify({ status: "stopped", build_outcome: "cancelled" }),
      ),
    ).toEqual({ kind: "failure", outcome: "cancelled" });
    expect(classifyBuild(JSON.stringify({ status: "stopped" }))).toEqual({
      kind: "failure",
      outcome: "unknown",
    });
  });

  it("accepts the result without the API envelope and output with text before the JSON", () => {
    expect(classifyBuild(JSON.stringify({ status: "running" }))).toMatchObject({
      kind: "running",
    });
    expect(classifyBuild(`Fetching build...\n${running}\n`)).toMatchObject({
      kind: "running",
    });
  });

  it("calls anything else unparsable", () => {
    expect(classifyBuild(unparsable).kind).toBe("unparsable");
    expect(classifyBuild("").kind).toBe("unparsable");
    expect(classifyBuild("[1,2]").kind).toBe("unparsable");
    expect(
      classifyBuild(JSON.stringify({ result: { build_uuid: "b" } })).kind,
    ).toBe("unparsable");
  });
});

describe("parseBuildStart", () => {
  it("finds the build uuid with or without the envelope", () => {
    expect(
      parseBuildStart(JSON.stringify({ result: { build_uuid: "b-1" } })),
    ).toEqual({ buildUuid: "b-1" });
    expect(parseBuildStart(JSON.stringify({ build_uuid: "b-2" }))).toEqual({
      buildUuid: "b-2",
    });
  });

  it("reports output without one", () => {
    expect(parseBuildStart(unparsable)).toHaveProperty("problem");
  });
});

describe("pollBuild", () => {
  /** Answers `outputs` in order, then repeats the last one; counts sleeps. */
  function scripted(outputs: Array<string | Error>) {
    let call = 0;
    const log = { gets: 0, sleeps: 0 };
    return {
      log,
      get: async () => {
        log.gets++;
        const next = outputs[Math.min(call++, outputs.length - 1)]!;
        if (next instanceof Error) throw next;
        return next;
      },
      sleep: async () => {
        log.sleeps++;
      },
    };
  }
  const bounds = { intervalMs: 1, maxPolls: 6, maxUnreadable: 3 };

  it("stops at the first success and sleeps only between polls", async () => {
    const s = scripted([queued, running, stoppedSuccess]);
    expect(await pollBuild({ ...s, ...bounds })).toEqual({
      kind: "success",
      commit: SHA,
      polls: 3,
    });
    expect(s.log).toEqual({ gets: 3, sleeps: 2 });
  });

  it("reports a failed build with its outcome", async () => {
    const s = scripted([running, stoppedFailure]);
    expect(await pollBuild({ ...s, ...bounds })).toEqual({
      kind: "failure",
      outcome: "fail",
      polls: 2,
    });
  });

  it("gives up after the poll limit and says what the build last was", async () => {
    const s = scripted([running]);
    expect(await pollBuild({ ...s, ...bounds })).toEqual({
      kind: "timeout",
      polls: 6,
      lastStatus: "running",
    });
    expect(s.log.gets).toBe(6);
  });

  it("gives up after unreadable answers in a row, and a good answer resets the count", async () => {
    const stuck = scripted([unparsable]);
    expect(await pollBuild({ ...stuck, ...bounds })).toMatchObject({
      kind: "unreadable",
      polls: 3,
    });
    expect(stuck.log.gets).toBe(3);

    const flaky = scripted([
      unparsable,
      unparsable,
      running,
      unparsable,
      stoppedSuccess,
    ]);
    expect(await pollBuild({ ...flaky, ...bounds })).toMatchObject({
      kind: "success",
      polls: 5,
    });
  });

  it("counts a failing cf command as an unreadable answer", async () => {
    const s = scripted([new Error("cf exited with 1")]);
    expect(await pollBuild({ ...s, ...bounds })).toMatchObject({
      kind: "unreadable",
      polls: 3,
      reason: "cf exited with 1",
    });
  });
});

describe("rehearse", () => {
  const limits: Limits = {
    intervalMs: 1,
    maxPolls: 5,
    maxUnreadable: 3,
    siteAttempts: 2,
  };

  function stubs(
    overrides: Partial<Deps> & {
      builds?: Array<string>;
      site?: Array<number>;
    } = {},
  ) {
    const calls: Array<string> = [];
    const builds = [...(overrides.builds ?? [running, stoppedSuccess])];
    const site = [...(overrides.site ?? [200])];
    const deps: Deps = {
      log: () => {},
      push: async (args) => void calls.push(`push ${args.join(" ")}`),
      getRemoteSha: async () => SHA,
      cf: async (args) => {
        calls.push(`cf ${args.slice(2, 4).join(" ")}`);
        return args[3] === "create"
          ? JSON.stringify({ result: { build_uuid: "b-1" } })
          : builds.length > 1
            ? builds.shift()!
            : builds[0]!;
      },
      sleep: async () => {},
      siteStatus: async () => site.shift() ?? 200,
      ...overrides,
    };
    return { deps, calls };
  }

  it("pushes, confirms, builds, polls and checks the site, in that order", async () => {
    const { deps, calls } = stubs();
    await rehearse(settings, SHA, deps, limits);
    expect(calls).toEqual([
      `push git push --force ${settings.remote} ${SHA}:refs/heads/rehearsal`,
      "cf builds create",
      "cf builds get",
      "cf builds get",
    ]);
  });

  it("starts no build when the push fails", async () => {
    const { deps, calls } = stubs({
      push: async () => {
        throw new Error("`git push` exited with 1: rejected");
      },
    });
    await expect(rehearse(settings, SHA, deps, limits)).rejects.toThrow(
      /rejected/,
    );
    expect(calls).toEqual([]);
  });

  it("starts no build when the fork's branch is somewhere else", async () => {
    const { deps, calls } = stubs({ getRemoteSha: async () => "e".repeat(40) });
    await expect(rehearse(settings, SHA, deps, limits)).rejects.toThrow(
      /no build was started/,
    );
    expect(calls.some((call) => call.startsWith("cf"))).toBe(false);
  });

  it("fails on a failed build, naming the build", async () => {
    const { deps } = stubs({ builds: [stoppedFailure] });
    await expect(rehearse(settings, SHA, deps, limits)).rejects.toThrow(
      /outcome fail \(build b-1\)/,
    );
  });

  it("fails when the build built a different commit", async () => {
    const other = JSON.stringify({
      status: "stopped",
      build_outcome: "success",
      build_trigger_metadata: { commit_hash: "a".repeat(40) },
    });
    const { deps } = stubs({ builds: [other] });
    await expect(rehearse(settings, SHA, deps, limits)).rejects.toThrow(
      /built a{40}, not/,
    );
  });

  it("fails on a timeout and on unreadable output instead of waiting on", async () => {
    await expect(
      rehearse(settings, SHA, stubs({ builds: [running] }).deps, limits),
    ).rejects.toThrow(/still running after 5 polls/);
    await expect(
      rehearse(settings, SHA, stubs({ builds: [unparsable] }).deps, limits),
    ).rejects.toThrow(/cannot read 3 times/);
  });

  it("fails when cf builds create prints no build uuid", async () => {
    const { deps } = stubs({ cf: async () => unparsable });
    await expect(rehearse(settings, SHA, deps, limits)).rejects.toThrow(
      /no build_uuid/,
    );
  });

  it("retries the site check, then fails if it never answers", async () => {
    await expect(
      rehearse(settings, SHA, stubs({ site: [503, 200] }).deps, limits),
    ).resolves.toBeUndefined();
    await expect(
      rehearse(settings, SHA, stubs({ site: [503, 503] }).deps, limits),
    ).rejects.toThrow(/does not answer \(last status 503\)/);
    const down = stubs({
      siteStatus: async () => {
        throw new Error("connection refused");
      },
    });
    await expect(rehearse(settings, SHA, down.deps, limits)).rejects.toThrow(
      /no response/,
    );
  });
});
