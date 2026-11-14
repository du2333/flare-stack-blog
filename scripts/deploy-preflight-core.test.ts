import { describe, expect, it, vi } from "vitest";
import type { UpgradesFile } from "../src/lib/version/upgrades.ts";
import {
  ACK_VARIABLE,
  MAX_DEPLOYMENTS_WALKED,
  MIGRATION_COUNT_SQL,
  PRE_GATE_VERSION,
  TABLE_EXISTS_SQL,
  UPGRADE_GUIDE_URL,
  checkSetup,
  decidePreflight,
  formatReadFailure,
  readLiveState,
  readSecretNames,
  tagVersion,
  type Cf,
  type CfResult,
  type LiveState,
  type PreflightInput,
  type SecretsRead,
} from "./deploy-preflight-core.ts";

// --- Decision ---------------------------------------------------------------

const file: UpgradesFile = {
  versions: [
    {
      version: "5.0.0",
      summary: "第五版。",
      before: [{ id: "move-media", text: "在后台导出媒体库" }],
      requires: { buildVars: ["MEDIA_BUCKET"], secrets: [] },
    },
    { version: "4.1.0", summary: "新增通知。" },
    {
      version: "4.0.0",
      summary: "第四版。",
      before: [
        {
          id: "secrets-as-secret",
          text: "把运行时变量删除后以 Secret 类型重新添加",
        },
        { id: "backup", text: "备份 D1 数据库" },
      ],
      requires: { buildVars: ["NOTIFY_QUEUE"], secrets: ["BETTER_AUTH_URL"] },
    },
    { version: "3.13.0", summary: "新增草稿。" },
    { version: "3.12.1", summary: "修复。" },
  ],
};

const tagged = (version: string, deployment = 1): LiveState => ({
  kind: "version",
  version,
  deployment,
});

function secrets(names: Array<string>) {
  return vi.fn((): SecretsRead => ({ ok: true, names }));
}

function input(overrides: Partial<PreflightInput> = {}): PreflightInput {
  return {
    live: tagged("3.12.1"),
    version: "3.13.0",
    file,
    unreleased: null,
    env: { WORKER_NAME: "blog", NOTIFY_QUEUE: "q", MEDIA_BUCKET: "m" },
    readSecrets: secrets(["BETTER_AUTH_URL"]),
    ...overrides,
  };
}

describe("decidePreflight", () => {
  it("proceeds within a major and says how the version was found", () => {
    const decision = decidePreflight(input());
    expect(decision.ok).toBe(true);
    expect(decision.ack).toBe("not-needed");
    expect(decision.text).toBe(
      "部署前检查：线上版本 3.12.1（取自最近一次部署的版本标签）；本次版本 3.13.0，同一大版本，继续部署。",
    );
  });

  it("checks nothing within a major, though the range holds requirements, and reads no Secrets", () => {
    // A minor carrying requirements: the release check refuses this now,
    // and within a major the preflight does not look.
    const minorWithRequirements: UpgradesFile = {
      versions: [
        {
          version: "3.13.0",
          summary: "新增草稿。",
          requires: { buildVars: ["DRAFT_BUCKET"], secrets: ["DRAFT_KEY"] },
        },
        { version: "3.12.1", summary: "修复。" },
      ],
    };
    const readSecrets = secrets([]);
    const decision = decidePreflight(
      input({ file: minorWithRequirements, env: {}, readSecrets }),
    );
    expect(decision.ok).toBe(true);
    expect(decision.missingBuildVars).toEqual([]);
    expect(readSecrets).not.toHaveBeenCalled();
  });

  it("proceeds when the same version is deployed again, or downgraded within the major", () => {
    expect(decidePreflight(input({ live: tagged("3.13.0") })).ok).toBe(true);
    expect(
      decidePreflight(input({ live: tagged("3.13.0"), version: "3.12.1" })).ok,
    ).toBe(true);
  });

  it("names the older deployment the tag came from", () => {
    expect(decidePreflight(input({ live: tagged("3.12.1", 3) })).text).toBe(
      "部署前检查：线上版本 3.12.1（取自最近第 3 次部署的版本标签，较新的 2 次部署没有版本标签）；本次版本 3.13.0，同一大版本，继续部署。",
    );
  });

  it("stops a cross-major upgrade without the acknowledgement", () => {
    const decision = decidePreflight(input({ version: "4.0.0" }));
    expect(decision.ok).toBe(false);
    expect(decision.ack).toBe("missing");
    expect(decision.text).toBe(
      [
        "部署前检查未通过，构建已停止。线上的博客没有改动，继续运行原来的版本。",
        "",
        "线上版本 3.12.1（取自最近一次部署的版本标签）；本次版本 4.0.0，跨越大版本（3 → 4）。大版本升级前必须先手动完成一些事项，否则升级后博客可能无法正常运行。",
        "",
        "请先完成以下事项：",
        "",
        "  v4.0.0 升级前",
        "  1. 把运行时变量删除后以 Secret 类型重新添加",
        "  2. 备份 D1 数据库",
        "",
        "确认以上事项都已完成后，在 Worker 的 Settings → Builds → Build variables 中添加变量：",
        "",
        "  UPGRADE_ACK=4",
        "",
        `升级说明：${UPGRADE_GUIDE_URL}`,
        "",
        "最后重试这次构建（Retry build）。以上都已完成时，检查会通过并继续迁移数据库和部署。",
      ].join("\n"),
    );
  });

  it("proceeds across a major with the right acknowledgement and the configuration present", () => {
    const readSecrets = secrets(["BETTER_AUTH_URL"]);
    const decision = decidePreflight(
      input({
        version: "4.0.0",
        env: { NOTIFY_QUEUE: "q", [ACK_VARIABLE]: "4" },
        readSecrets,
      }),
    );
    expect(decision.ok).toBe(true);
    expect(decision.ack).toBe("given");
    expect(readSecrets).toHaveBeenCalledTimes(1);
    expect(decision.text).toBe(
      "部署前检查：线上版本 3.12.1（取自最近一次部署的版本标签）；本次版本 4.0.0，跨越大版本（3 → 4），UPGRADE_ACK=4 已确认，继续部署。",
    );
  });

  it("refuses an acknowledgement of another major and says to change it", () => {
    const decision = decidePreflight(
      input({ version: "4.0.0", env: { NOTIFY_QUEUE: "q", UPGRADE_ACK: "3" } }),
    );
    expect(decision.ok).toBe(false);
    expect(decision.ack).toBe("wrong");
    expect(decision.text).toContain(
      "确认以上事项都已完成后，在 Worker 的 Settings → Builds → Build variables 中把 UPGRADE_ACK 的值从 3 改为 4（3 确认的是另一个大版本）：",
    );
    expect(decision.text).toContain("  UPGRADE_ACK=4");
  });

  it("reads an empty acknowledgement as missing", () => {
    expect(
      decidePreflight(input({ version: "4.0.0", env: { UPGRADE_ACK: " " } }))
        .ack,
    ).toBe("missing");
  });

  it("stops a downgrade to a lower major, warns about the data and checks no configuration", () => {
    const readSecrets = secrets([]);
    const decision = decidePreflight(
      input({ live: tagged("4.1.0"), version: "3.13.0", env: {}, readSecrets }),
    );
    expect(decision.ok).toBe(false);
    expect(decision.ack).toBe("missing");
    expect(decision.text).toContain("降到更低的大版本（4 → 3）");
    expect(decision.text).toContain("数据不一定还能被旧版本的代码使用");
    expect(decision.text).not.toContain("请先完成以下事项");
    expect(decision.text).toContain("确认要继续后");
    expect(decision.text).toContain("  UPGRADE_ACK=3");
    expect(readSecrets).not.toHaveBeenCalled();
    expect(
      decidePreflight(
        input({
          live: tagged("4.1.0"),
          version: "3.13.0",
          env: { UPGRADE_ACK: "3" },
        }),
      ).ok,
    ).toBe(true);
  });

  it("lists a missing build variable of a major with the version that needs it", () => {
    const decision = decidePreflight(
      input({ version: "4.0.0", env: { UPGRADE_ACK: "4", NOTIFY_QUEUE: "" } }),
    );
    expect(decision.ok).toBe(false);
    expect(decision.ack).toBe("given");
    expect(decision.missingBuildVars).toEqual([
      { name: "NOTIFY_QUEUE", version: "4.0.0" },
    ]);
    expect(decision.text).toContain(
      "跨越大版本（3 → 4），UPGRADE_ACK=4 已确认，但缺少新版本需要的配置。",
    );
    expect(decision.text).toContain(
      "  1. 在 Worker 的 Settings → Builds → Build variables 中添加变量 NOTIFY_QUEUE（4.0.0 需要）。",
    );
    expect(decision.text).not.toContain("备份 D1 数据库");
    expect(decision.text).not.toContain("UPGRADE_ACK=4\n");
  });

  it("lists a missing Secret of a major with the version that needs it", () => {
    const decision = decidePreflight(
      input({
        version: "4.0.0",
        env: { UPGRADE_ACK: "4", NOTIFY_QUEUE: "q" },
        readSecrets: secrets(["DOMAIN"]),
      }),
    );
    expect(decision.ok).toBe(false);
    expect(decision.missingSecrets).toEqual([
      { name: "BETTER_AUTH_URL", version: "4.0.0" },
    ]);
    expect(decision.text).toContain(
      "  1. 在 Worker 的 Settings → Runtime variables and secrets 中以 Secret 类型添加 BETTER_AUTH_URL（4.0.0 需要）。",
    );
  });

  it("reports missing configuration and a missing acknowledgement in one output", () => {
    const decision = decidePreflight(
      input({ version: "4.0.0", env: {}, readSecrets: secrets([]) }),
    );
    expect(decision.ack).toBe("missing");
    expect(decision.text).toContain(
      [
        "  v4.0.0 升级前",
        "  1. 把运行时变量删除后以 Secret 类型重新添加",
        "  2. 备份 D1 数据库",
        "",
        "  缺少的配置",
        "  3. 在 Worker 的 Settings → Builds → Build variables 中添加变量 NOTIFY_QUEUE（4.0.0 需要）。",
        "  4. 在 Worker 的 Settings → Runtime variables and secrets 中以 Secret 类型添加 BETTER_AUTH_URL（4.0.0 需要）。",
      ].join("\n"),
    );
    expect(decision.text).toContain("  UPGRADE_ACK=4");
  });

  it("reads no Secrets across a major when no version crossed names one", () => {
    const readSecrets = secrets([]);
    const decision = decidePreflight(
      input({
        live: tagged("4.1.0"),
        version: "5.0.0",
        env: { UPGRADE_ACK: "5", MEDIA_BUCKET: "m" },
        readSecrets,
      }),
    );
    expect(decision.ok).toBe(true);
    expect(readSecrets).not.toHaveBeenCalled();
  });

  it("stops with the read failure when the Secret list cannot be read", () => {
    const decision = decidePreflight(
      input({
        version: "4.0.0",
        env: { UPGRADE_ACK: "4", NOTIFY_QUEUE: "q" },
        readSecrets: () => ({
          ok: false,
          failure: {
            read: "读取 Worker 的 Secret 名称",
            command: "cf workers secrets list --worker blog",
            detail: "退出码 1",
          },
        }),
      }),
    );
    expect(decision.ok).toBe(false);
    expect(decision.text.split("\n")[0]).toBe(
      "部署前检查未通过，构建已停止：无法读取 Worker 的 Secret 名称。线上的博客没有改动，继续运行原来的版本。",
    );
  });

  it("prints the before items of both majors crossed, oldest first, numbered on", () => {
    const decision = decidePreflight(
      input({ version: "5.0.0", env: { NOTIFY_QUEUE: "q" } }),
    );
    expect(decision.ok).toBe(false);
    expect(decision.text).toContain(
      [
        "请先完成以下事项：",
        "",
        "  v4.0.0 升级前",
        "  1. 把运行时变量删除后以 Secret 类型重新添加",
        "  2. 备份 D1 数据库",
        "",
        "  v5.0.0 升级前",
        "  3. 在后台导出媒体库",
        "",
        "  缺少的配置",
        "  4. 在 Worker 的 Settings → Builds → Build variables 中添加变量 MEDIA_BUCKET（5.0.0 需要）。",
      ].join("\n"),
    );
    expect(decision.text).toContain("跨越大版本（3 → 5）");
    expect(decision.text).toContain("  UPGRADE_ACK=5");
  });

  it("proceeds on a fresh install, checking nothing else", () => {
    const readSecrets = secrets([]);
    const decision = decidePreflight(
      input({
        live: { kind: "fresh" },
        version: "5.0.0",
        env: {},
        readSecrets,
      }),
    );
    expect(decision.ok).toBe(true);
    expect(readSecrets).not.toHaveBeenCalled();
    expect(decision.text).toBe(
      "部署前检查：线上没有带版本标签的部署，D1 也没有迁移记录，按全新安装处理；本次版本 5.0.0，继续部署。",
    );
  });

  it("takes a pre-gate site as 3.0.0", () => {
    const same = decidePreflight(
      input({ live: { kind: "pre-gate", untagged: 2 } }),
    );
    expect(same.ok).toBe(true);
    expect(same.text).toBe(
      `部署前检查：最近 2 次部署都没有版本标签，D1 已有迁移记录，按闸门上线前安装的站点处理（视为 ${PRE_GATE_VERSION}）；本次版本 3.13.0，同一大版本，继续部署。`,
    );
    const across = decidePreflight(
      input({ live: { kind: "pre-gate", untagged: 2 }, version: "4.0.0" }),
    );
    expect(across.ok).toBe(false);
    expect(across.text).toContain("跨越大版本（3 → 4）");
    expect(across.text).toContain("备份 D1 数据库");
    expect(across.text).not.toContain("第一次部署在数据库迁移之后失败");
  });

  it("skips the Secrets of a Worker with no deployment over migrated data, and says a failed first deploy needs only the variable", () => {
    const readSecrets = secrets([]);
    const live: LiveState = { kind: "pre-gate", untagged: 0 };
    const decision = decidePreflight(
      input({
        live,
        version: "4.0.0",
        env: { NOTIFY_QUEUE: "q" },
        readSecrets,
      }),
    );
    expect(readSecrets).not.toHaveBeenCalled();
    expect(decision.missingSecrets).toEqual([]);
    expect(decision.ack).toBe("missing");
    expect(decision.text).toContain(
      "线上没有这个 Worker 的部署，D1 已有迁移记录，按闸门上线前安装的站点处理（视为 3.0.0）；本次版本 4.0.0",
    );
    expect(decision.text).toContain(
      "也可能是第一次部署在数据库迁移之后失败了。如果是这样，不需要先完成任何事项，直接添加下面的变量即可。",
    );
    const acknowledged = decidePreflight(
      input({
        live,
        version: "4.0.0",
        env: { NOTIFY_QUEUE: "q", UPGRADE_ACK: "4" },
        readSecrets,
      }),
    );
    expect(acknowledged.ok).toBe(true);
    expect(readSecrets).not.toHaveBeenCalled();
  });

  it("treats a prerelease by its major, with the file's unreleased entry as its own notes", () => {
    const unreleased = {
      summary: "第四版。",
      before: [{ id: "backup", text: "备份 D1 数据库" }],
      requires: { buildVars: ["BETA_FLAG"], secrets: [] },
    };
    const releasesOnly: UpgradesFile = {
      versions: [{ version: "3.12.1", summary: "修复。" }],
    };

    const withNotes = decidePreflight(
      input({
        version: "4.0.0-beta.1",
        file: releasesOnly,
        unreleased,
        env: {},
      }),
    );
    expect(withNotes.ok).toBe(false);
    expect(withNotes.text).toContain("跨越大版本（3 → 4）");
    expect(withNotes.text).toContain(
      ["  v4.0.0-beta.1 升级前", "  1. 备份 D1 数据库"].join("\n"),
    );
    expect(withNotes.missingBuildVars).toEqual([
      { name: "BETA_FLAG", version: "4.0.0-beta.1" },
    ]);
    expect(withNotes.text).toContain("  UPGRADE_ACK=4");

    const without = decidePreflight(
      input({ version: "4.0.0-beta.1", file: releasesOnly, unreleased: null }),
    );
    expect(without.text).toContain("没有记录升级前事项");
    expect(
      decidePreflight(
        input({
          version: "4.0.0-beta.1",
          file: releasesOnly,
          env: { UPGRADE_ACK: "4" },
        }),
      ).ok,
    ).toBe(true);
    expect(
      decidePreflight(input({ version: "3.14.0-beta.0", unreleased })).ok,
    ).toBe(true);
  });

  it("ignores unreleased for a release build", () => {
    const decision = decidePreflight(
      input({
        version: "4.0.0",
        env: { NOTIFY_QUEUE: "q", UPGRADE_ACK: "4" },
        unreleased: {
          summary: "下一版。",
          before: [{ id: "later", text: "以后再做" }],
          requires: { buildVars: ["LATER"], secrets: [] },
        },
      }),
    );
    expect(decision.ok).toBe(true);
  });
});

// --- Setup ------------------------------------------------------------------

describe("checkSetup", () => {
  const env = {
    npm_package_version: "3.12.1",
    WORKER_NAME: "blog",
    D1_DATABASE_ID: "db",
  };

  it("returns the version and the names as the migration step uses them", () => {
    expect(checkSetup("3.12.1", { ...env, D1_DATABASE_ID: " db" })).toEqual({
      ok: true,
      version: "3.12.1",
      worker: "blog",
      databaseId: " db",
    });
  });

  it("stops when the tag would not be package.json's version", () => {
    const cases: Array<[string | undefined, string]> = [
      [
        undefined,
        "部署标签取自环境变量 npm_package_version，没有设置，而 package.json 中的版本是 3.12.1。",
      ],
      [
        "",
        "部署标签取自环境变量 npm_package_version，它的值为空，而 package.json 中的版本是 3.12.1。",
      ],
      [
        "3.12.0",
        "部署标签取自环境变量 npm_package_version，它的值是 3.12.0，而 package.json 中的版本是 3.12.1。",
      ],
    ];
    for (const [value, text] of cases) {
      const setup = checkSetup("3.12.1", {
        ...env,
        npm_package_version: value,
      });
      expect(setup.ok).toBe(false);
      if (!setup.ok) expect(setup.text).toContain(text);
    }
  });

  it("stops on an invalid package.json version", () => {
    expect(checkSetup("three", env)).toEqual({
      ok: false,
      text: "部署前检查未通过，构建已停止：package.json 中的 version（three）不是合法的版本号。",
    });
  });

  it("names the missing or empty Build variables", () => {
    expect(
      checkSetup("3.12.1", {
        npm_package_version: "3.12.1",
        D1_DATABASE_ID: " ",
      }),
    ).toEqual({
      ok: false,
      text: "部署前检查未通过，构建已停止：缺少构建变量 WORKER_NAME、D1_DATABASE_ID。请在 Worker 的 Settings → Builds → Build variables 中添加后重试这次构建（Retry build）。",
    });
  });
});

// --- Reading what is live ----------------------------------------------------

const WORKER = "blog";
const DATABASE = "00000000-0000-0000-0000-000000000000";

const ok = (value: unknown): CfResult => ({
  status: 0,
  stdout: JSON.stringify(value, null, 2),
  stderr: "",
});
const exit = (stderr: string, status = 1): CfResult => ({
  status,
  stdout: "",
  stderr,
});
const NO_WORKER = exit(
  "✘ [10007] This Worker does not exist on your account.\n",
);

function deployment(
  versions: Array<{ version_id: string; percentage: number }>,
) {
  return {
    id: "d-1",
    source: "wrangler",
    strategy: "percentage",
    author_email: "owner@example.com",
    annotations: {
      "workers/message": "Automatic deployment",
      "workers/triggered_by": "deployment",
    },
    versions,
    created_on: "2026-11-13T00:00:00Z",
  };
}

const only = (id: string) => deployment([{ version_id: id, percentage: 100 }]);
const deployments = (...ids: Array<string>) =>
  ok({ deployments: ids.map(only) });

function version(id: string, annotations?: Record<string, unknown>) {
  return ok({
    id,
    number: 12,
    ...(annotations ? { annotations } : {}),
    created_on: "2026-11-13T00:00:00Z",
  });
}
const withTag = (id: string, tag: string) =>
  version(id, { "workers/tag": tag, "workers/triggered_by": "upload" });

const d1 = (results: Array<unknown>) =>
  ok([{ results, success: true, meta: { duration: 0.1 } }]);

/** A `cf` that answers each command from the table and records the calls. */
function fakeCf(answers: {
  deployments?: CfResult;
  versions?: Record<string, CfResult>;
  table?: CfResult;
  count?: CfResult;
  secrets?: CfResult;
}) {
  const calls: Array<Array<string>> = [];
  const cf: Cf = (args) => {
    calls.push(args);
    const command = args.slice(0, 3).join(" ");
    if (command === "workers deployments list") {
      return answers.deployments ?? ok({ deployments: [] });
    }
    if (command === "workers versions get") {
      return answers.versions?.[args[3]] ?? exit("unexpected version");
    }
    if (command === "workers secrets list") return answers.secrets ?? ok([]);
    if (args[0] === "d1" && args[4] === TABLE_EXISTS_SQL) {
      return answers.table ?? d1([]);
    }
    if (args[0] === "d1" && args[4] === MIGRATION_COUNT_SQL) {
      return answers.count ?? d1([{ n: 0 }]);
    }
    return exit(`unexpected command ${args.join(" ")}`);
  };
  return { cf, calls };
}

const MIGRATED = {
  table: d1([{ name: "d1_migrations" }]),
  count: d1([{ n: 34 }]),
};

describe("readLiveState", () => {
  it("reads the version from the newest deployment's tag and leaves D1 alone", () => {
    const { cf, calls } = fakeCf({
      deployments: deployments("v-1"),
      versions: { "v-1": withTag("v-1", "v3.12.1") },
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "version", version: "3.12.1", deployment: 1 },
    });
    expect(calls).toEqual([
      ["workers", "deployments", "list", "--worker", WORKER],
      ["workers", "versions", "get", "v-1", "--worker", WORKER],
    ]);
  });

  it("walks back past an untagged newest deployment to a tagged older one", () => {
    const { cf, calls } = fakeCf({
      deployments: deployments("v-dash", "v-1", "v-0"),
      versions: {
        "v-dash": version("v-dash", { "workers/triggered_by": "secret" }),
        "v-1": withTag("v-1", "v3.12.1"),
      },
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "version", version: "3.12.1", deployment: 2 },
    });
    expect(calls).toHaveLength(3);
  });

  it("walks past a tag that is not exactly v plus a version", () => {
    for (const tag of [
      "production",
      "3.12.1",
      "v3.12",
      "vv3.12.1",
      "v03.1.0",
      "v3.12.1+b",
    ]) {
      const { cf } = fakeCf({
        deployments: deployments("v-bad", "v-1"),
        versions: {
          "v-bad": withTag("v-bad", tag),
          "v-1": withTag("v-1", "v3.11.0"),
        },
      });
      expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
        ok: true,
        state: { kind: "version", version: "3.11.0", deployment: 2 },
      });
    }
  });

  it("takes the version with the largest percentage of each deployment", () => {
    const { cf, calls } = fakeCf({
      deployments: ok({
        deployments: [
          deployment([
            { version_id: "v-old", percentage: 30 },
            { version_id: "v-new", percentage: 70 },
          ]),
          only("v-older"),
        ],
      }),
      versions: { "v-new": withTag("v-new", "v4.0.0-beta.1") },
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toMatchObject({
      ok: true,
      state: { kind: "version", version: "4.0.0-beta.1", deployment: 1 },
    });
    expect(calls[1]).toContain("v-new");
  });

  it("reads a version serving several deployments once", () => {
    const { cf, calls } = fakeCf({
      deployments: deployments("v-1", "v-1", "v-0"),
      versions: {
        "v-1": version("v-1"),
        "v-0": withTag("v-0", "v3.12.0"),
      },
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toMatchObject({
      state: { kind: "version", version: "3.12.0", deployment: 3 },
    });
    expect(calls.filter((call) => call[1] === "versions")).toHaveLength(2);
  });

  it(`walks at most ${MAX_DEPLOYMENTS_WALKED} deployments, then asks D1`, () => {
    const ids = Array.from(
      { length: MAX_DEPLOYMENTS_WALKED + 2 },
      (_, i) => `v-${i}`,
    );
    const versions = Object.fromEntries(ids.map((id) => [id, version(id)]));
    versions[ids.at(-1)!] = withTag(ids.at(-1)!, "v3.12.1");
    const { cf, calls } = fakeCf({
      deployments: deployments(...ids),
      versions,
      ...MIGRATED,
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "pre-gate", untagged: MAX_DEPLOYMENTS_WALKED },
    });
    expect(calls.filter((call) => call[1] === "versions")).toHaveLength(
      MAX_DEPLOYMENTS_WALKED,
    );
  });

  it("asks D1 when no deployment in the walk has a version tag", () => {
    const { cf, calls } = fakeCf({
      deployments: deployments("v-2", "v-1"),
      versions: { "v-2": version("v-2"), "v-1": withTag("v-1", "release") },
      ...MIGRATED,
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "pre-gate", untagged: 2 },
    });
    expect(calls.slice(3)).toEqual([
      ["d1", "query", DATABASE, "--sql", TABLE_EXISTS_SQL],
      ["d1", "query", DATABASE, "--sql", MIGRATION_COUNT_SQL],
    ]);
  });

  it("asks D1 when there is no deployment", () => {
    const { cf } = fakeCf({
      deployments: ok({ deployments: [] }),
      ...MIGRATED,
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "pre-gate", untagged: 0 },
    });
  });

  it("asks D1 when the Worker does not exist (error 10007)", () => {
    expect(
      readLiveState(
        fakeCf({ deployments: NO_WORKER, ...MIGRATED }).cf,
        WORKER,
        DATABASE,
      ),
    ).toEqual({
      ok: true,
      state: { kind: "pre-gate", untagged: 0 },
    });
    expect(
      readLiveState(fakeCf({ deployments: NO_WORKER }).cf, WORKER, DATABASE),
    ).toEqual({
      ok: true,
      state: { kind: "fresh" },
    });
  });

  it("reads a fresh install from a missing or an empty migrations table", () => {
    expect(
      readLiveState(fakeCf({ table: d1([]) }).cf, WORKER, DATABASE),
    ).toEqual({
      ok: true,
      state: { kind: "fresh" },
    });
    const empty = fakeCf({
      table: d1([{ name: "d1_migrations" }]),
      count: d1([{ n: 0 }]),
    });
    expect(readLiveState(empty.cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "fresh" },
    });
    expect(empty.calls).toHaveLength(3);
  });

  it("fails by name when reading the deployments fails", () => {
    const { cf } = fakeCf({
      deployments: exit("✘ [10000] Authentication error\n"),
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: false,
      failure: {
        read: "读取线上部署",
        command: `cf workers deployments list --worker ${WORKER}`,
        detail: "退出码 1，输出：\n✘ [10000] Authentication error",
      },
    });
  });

  it("fails when a version read fails, without walking on or looking at D1", () => {
    const { cf, calls } = fakeCf({ deployments: deployments("v-1", "v-0") });
    expect(readLiveState(cf, WORKER, DATABASE)).toMatchObject({
      ok: false,
      failure: { read: "读取线上的 Worker 版本" },
    });
    expect(calls).toHaveLength(2);
  });

  it("fails when a D1 query fails", () => {
    const { cf } = fakeCf({
      table: d1([{ name: "d1_migrations" }]),
      count: exit("no such table: d1_migrations: SQLITE_ERROR"),
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toMatchObject({
      ok: false,
      failure: {
        read: "读取 D1 迁移记录数",
        command: `cf d1 query ${DATABASE} --sql "${MIGRATION_COUNT_SQL}"`,
      },
    });
  });

  it("fails on output that is not JSON or not the recorded shape", () => {
    const cases: Array<[Parameters<typeof fakeCf>[0], string]> = [
      [
        { deployments: { status: 0, stdout: "Update available!", stderr: "" } },
        "输出不是 JSON",
      ],
      [{ deployments: ok([]) }, "没有 deployments 列表"],
      [
        { deployments: ok({ deployments: [deployment([])] }) },
        "部署没有任何版本",
      ],
      [
        {
          deployments: ok({
            deployments: [deployment([{ version_id: "v-1" } as never])],
          }),
        },
        "缺少 version_id 或 percentage",
      ],
      [
        { deployments: deployments("v-1"), versions: { "v-1": ok([]) } },
        "不是一个对象",
      ],
      [{ table: ok({ results: [] }) }, "不是只含一条结果的列表"],
      [{ table: ok([{ results: [], success: false }]) }, "success 不是 true"],
      [
        { table: d1([{ name: "d1_migrations" }]), count: d1([{ n: "34" }]) },
        "没有数字 n",
      ],
    ];
    for (const [answers, detail] of cases) {
      const read = readLiveState(fakeCf(answers).cf, WORKER, DATABASE);
      expect(read.ok).toBe(false);
      if (!read.ok) expect(read.failure.detail).toContain(detail);
    }
  });

  it("fails when cf cannot be started", () => {
    const cf: Cf = () => ({
      status: null,
      stdout: "",
      stderr: "",
      error: "spawn ENOENT",
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toMatchObject({
      ok: false,
      failure: { detail: "无法运行 cf：spawn ENOENT" },
    });
  });
});

describe("readSecretNames", () => {
  it("reads the names from the recorded shape", () => {
    const { cf, calls } = fakeCf({
      secrets: ok([
        { name: "BETTER_AUTH_URL", type: "secret_text" },
        { name: "DOMAIN", type: "secret_text" },
      ]),
    });
    expect(readSecretNames(cf, WORKER)).toEqual({
      ok: true,
      names: ["BETTER_AUTH_URL", "DOMAIN"],
    });
    expect(calls).toEqual([["workers", "secrets", "list", "--worker", WORKER]]);
  });

  it("fails by name on any failure, 10007 included", () => {
    for (const secrets of [NO_WORKER, exit("✘ [10000] Authentication error")]) {
      expect(readSecretNames(fakeCf({ secrets }).cf, WORKER)).toMatchObject({
        ok: false,
        failure: { read: "读取 Worker 的 Secret 名称" },
      });
    }
    expect(
      readSecretNames(
        fakeCf({ secrets: ok([{ type: "secret_text" }]) }).cf,
        WORKER,
      ),
    ).toMatchObject({
      ok: false,
      failure: { detail: "输出的结构与预期不符：条目缺少 name" },
    });
  });
});

describe("formatReadFailure", () => {
  it("says which read failed, the command, the output and what to check", () => {
    const text = formatReadFailure({
      read: "读取线上部署",
      command: "cf workers deployments list --worker blog",
      detail: "退出码 1，输出：\n✘ [10000] Authentication error",
    });
    expect(text.split("\n")[0]).toBe(
      "部署前检查未通过，构建已停止：无法读取线上部署。线上的博客没有改动，继续运行原来的版本。",
    );
    expect(text).toContain("命令：cf workers deployments list --worker blog");
    expect(text).toContain("Authentication error");
    expect(text).toContain("重试这次构建");
  });
});

describe("tagVersion", () => {
  it("reads exactly v plus a canonical version", () => {
    expect(tagVersion("v3.12.1")).toBe("3.12.1");
    expect(tagVersion("v0.0.0-probe.1")).toBe("0.0.0-probe.1");
    expect(tagVersion("3.12.1")).toBeNull();
    expect(tagVersion("vv3.12.1")).toBeNull();
    expect(tagVersion("v3.12.1+build")).toBeNull();
    expect(tagVersion(3)).toBeNull();
  });
});
