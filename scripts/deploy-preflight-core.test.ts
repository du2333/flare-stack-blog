import { describe, expect, it } from "vitest";
import type { UpgradesFile } from "../src/lib/version/upgrades.ts";
import {
  ACK_VARIABLE,
  MIGRATION_COUNT_SQL,
  PRE_GATE_VERSION,
  TABLE_EXISTS_SQL,
  UPGRADE_GUIDE_URL,
  decidePreflight,
  formatReadFailure,
  readLiveState,
  readSecretNames,
  tagVersion,
  type Cf,
  type CfResult,
  type PreflightInput,
} from "./deploy-preflight-core.ts";

// --- Decision ---------------------------------------------------------------

const file: UpgradesFile = {
  versions: [
    {
      version: "5.0.0",
      summary: "第五版。",
      before: [{ id: "move-media", text: "在后台导出媒体库" }],
    },
    {
      version: "4.1.0",
      summary: "新增通知。",
      requires: { buildVars: ["NOTIFY_QUEUE"], secrets: [] },
    },
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
      requires: { buildVars: [], secrets: ["BETTER_AUTH_URL"] },
    },
    {
      version: "3.13.0",
      summary: "新增草稿。",
      requires: { buildVars: ["DRAFT_BUCKET"], secrets: ["DRAFT_KEY"] },
    },
    { version: "3.12.1", summary: "修复。" },
  ],
};

function input(overrides: Partial<PreflightInput> = {}): PreflightInput {
  return {
    live: { kind: "version", version: "3.12.1" },
    version: "3.13.0",
    file,
    envNames: ["WORKER_NAME", "DRAFT_BUCKET"],
    secretNames: ["DRAFT_KEY", "BETTER_AUTH_URL"],
    ack: undefined,
    ...overrides,
  };
}

describe("decidePreflight", () => {
  it("proceeds within a major and says so in one line", () => {
    const decision = decidePreflight(input());
    expect(decision.ok).toBe(true);
    expect(decision.ack).toBe("not-needed");
    expect(decision.text).toBe(
      "部署前检查：线上版本 3.12.1，本次版本 3.13.0，同一大版本，继续部署。",
    );
  });

  it("proceeds when the same version is deployed again", () => {
    const decision = decidePreflight(
      input({ live: { kind: "version", version: "3.13.0" } }),
    );
    expect(decision.ok).toBe(true);
  });

  it("proceeds on a downgrade within the major, checking nothing", () => {
    const decision = decidePreflight(
      input({
        live: { kind: "version", version: "3.13.0" },
        version: "3.12.1",
        envNames: [],
        secretNames: [],
      }),
    );
    expect(decision.ok).toBe(true);
    expect(decision.text).toContain("同一大版本，继续部署");
  });

  it("stops a cross-major upgrade without the acknowledgement", () => {
    const decision = decidePreflight(input({ version: "4.0.0" }));
    expect(decision.ok).toBe(false);
    expect(decision.ack).toBe("missing");
    expect(decision.text).toBe(
      [
        "部署前检查未通过，构建已停止。线上的博客没有改动，继续运行原来的版本。",
        "",
        "线上版本 3.12.1，本次版本 4.0.0，跨越大版本（3 → 4）。大版本升级前必须先手动完成一些事项，否则升级后博客可能无法正常运行。",
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

  it("proceeds across a major with the right acknowledgement", () => {
    const decision = decidePreflight(input({ version: "4.0.0", ack: "4" }));
    expect(decision.ok).toBe(true);
    expect(decision.ack).toBe("given");
    expect(decision.text).toBe(
      "部署前检查：线上版本 3.12.1，本次版本 4.0.0，跨越大版本（3 → 4），UPGRADE_ACK=4 已确认，继续部署。",
    );
  });

  it("refuses an acknowledgement of another major and says to change it", () => {
    const decision = decidePreflight(input({ version: "4.0.0", ack: "3" }));
    expect(decision.ok).toBe(false);
    expect(decision.ack).toBe("wrong");
    expect(decision.text).toContain(
      "现在的 UPGRADE_ACK 是 3，它确认的不是大版本 4，请把它改为 4。",
    );
    expect(decision.text).toContain("  UPGRADE_ACK=4");
  });

  it("reads an empty acknowledgement as missing", () => {
    expect(decidePreflight(input({ version: "4.0.0", ack: " " })).ack).toBe(
      "missing",
    );
  });

  it("stops a downgrade to a lower major and warns about the data", () => {
    const decision = decidePreflight(
      input({ live: { kind: "version", version: "4.1.0" }, version: "3.13.0" }),
    );
    expect(decision.ok).toBe(false);
    expect(decision.ack).toBe("missing");
    expect(decision.text).toContain("降到更低的大版本（4 → 3）");
    expect(decision.text).toContain("数据不一定还能被旧版本的代码使用");
    expect(decision.text).not.toContain("请先完成以下事项");
    expect(decision.text).toContain("确认要继续后");
    expect(decision.text).toContain("  UPGRADE_ACK=3");
    expect(
      decidePreflight(
        input({
          live: { kind: "version", version: "4.1.0" },
          version: "3.13.0",
          ack: "3",
        }),
      ).ok,
    ).toBe(true);
  });

  it("lists a missing build variable with the version that needs it", () => {
    const decision = decidePreflight(input({ envNames: ["WORKER_NAME"] }));
    expect(decision.ok).toBe(false);
    expect(decision.ack).toBe("not-needed");
    expect(decision.missingBuildVars).toEqual([
      { name: "DRAFT_BUCKET", version: "3.13.0" },
    ]);
    expect(decision.text).toContain("同一大版本，但缺少本次版本需要的配置");
    expect(decision.text).toContain(
      "  1. 在 Worker 的 Settings → Builds → Build variables 中添加变量 DRAFT_BUCKET（3.13.0 需要）。",
    );
    expect(decision.text).not.toContain(ACK_VARIABLE);
  });

  it("lists a missing Secret with the version that needs it", () => {
    const decision = decidePreflight(input({ secretNames: [] }));
    expect(decision.ok).toBe(false);
    expect(decision.missingSecrets).toEqual([
      { name: "DRAFT_KEY", version: "3.13.0" },
    ]);
    expect(decision.text).toContain(
      "在 Worker 的 Settings → Runtime variables and secrets 中以 Secret 类型添加 DRAFT_KEY（3.13.0 需要）。",
    );
  });

  it("checks the requirements of an acknowledged cross-major upgrade too", () => {
    const decision = decidePreflight(
      input({ version: "4.0.0", ack: "4", secretNames: ["DRAFT_KEY"] }),
    );
    expect(decision.ok).toBe(false);
    expect(decision.ack).toBe("given");
    expect(decision.missingSecrets).toEqual([
      { name: "BETTER_AUTH_URL", version: "4.0.0" },
    ]);
    expect(decision.text).not.toContain("UPGRADE_ACK=4\n");
    expect(decision.text).not.toContain("备份 D1 数据库");
    expect(decision.text).toContain(
      "  1. 在 Worker 的 Settings → Runtime variables and secrets 中以 Secret 类型添加 BETTER_AUTH_URL（4.0.0 需要）。",
    );
  });

  it("prints the before items of both majors crossed, oldest first, numbered on", () => {
    const decision = decidePreflight(
      input({ version: "5.0.0", envNames: ["DRAFT_BUCKET"] }),
    );
    expect(decision.ok).toBe(false);
    const text = decision.text;
    expect(text).toContain(
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
        "  4. 在 Worker 的 Settings → Builds → Build variables 中添加变量 NOTIFY_QUEUE（4.1.0 需要）。",
      ].join("\n"),
    );
    expect(text).toContain("跨越大版本（3 → 5）");
    expect(text).toContain("  UPGRADE_ACK=5");
  });

  it("proceeds on a fresh install, checking nothing else", () => {
    const decision = decidePreflight(
      input({
        live: { kind: "fresh" },
        version: "5.0.0",
        envNames: [],
        secretNames: "unknown",
      }),
    );
    expect(decision.ok).toBe(true);
    expect(decision.text).toBe(
      "部署前检查：线上没有带版本标签的 Worker 版本，D1 也没有迁移记录，按全新安装处理；本次版本 5.0.0，继续部署。",
    );
  });

  it("takes a pre-gate site as 3.0.0", () => {
    const same = decidePreflight(input({ live: { kind: "pre-gate" } }));
    expect(same.ok).toBe(true);
    expect(same.text).toBe(
      `部署前检查：线上没有带版本标签的 Worker 版本，D1 已有迁移记录，按闸门上线前安装的站点处理（视为 ${PRE_GATE_VERSION}），本次版本 3.13.0，同一大版本，继续部署。`,
    );
    const across = decidePreflight(
      input({ live: { kind: "pre-gate" }, version: "4.0.0" }),
    );
    expect(across.ok).toBe(false);
    expect(across.text).toContain("跨越大版本（3 → 4）");
    expect(across.text).toContain("备份 D1 数据库");
  });

  it("treats a prerelease by its major", () => {
    const beta = decidePreflight(input({ version: "4.0.0-beta.1" }));
    expect(beta.ok).toBe(false);
    expect(beta.text).toContain("跨越大版本（3 → 4）");
    expect(beta.text).toContain("  UPGRADE_ACK=4");
    // The file lists releases only, so a beta of 4.0.0 passes none of 4.0.0's notes.
    expect(beta.text).toContain("没有记录升级前事项");
    expect(
      decidePreflight(input({ version: "4.0.0-beta.1", ack: "4" })).ok,
    ).toBe(true);
    expect(decidePreflight(input({ version: "3.14.0-beta.0" })).ok).toBe(true);
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

function version(id: string, annotations?: Record<string, unknown>) {
  return {
    id,
    number: 12,
    ...(annotations ? { annotations } : {}),
    created_on: "2026-11-13T00:00:00Z",
  };
}

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
  it("reads the version from the serving version's tag and leaves D1 alone", () => {
    const { cf, calls } = fakeCf({
      deployments: ok({
        deployments: [deployment([{ version_id: "v-1", percentage: 100 }])],
      }),
      versions: { "v-1": ok(version("v-1", { "workers/tag": "v3.12.1" })) },
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "version", version: "3.12.1" },
      via: "tag",
      tag: "v3.12.1",
    });
    expect(calls).toEqual([
      ["workers", "deployments", "list", "--worker", WORKER],
      ["workers", "versions", "get", "v-1", "--worker", WORKER],
    ]);
  });

  it("takes the version with the largest percentage of the first deployment", () => {
    const { cf, calls } = fakeCf({
      deployments: ok({
        deployments: [
          deployment([
            { version_id: "v-old", percentage: 30 },
            { version_id: "v-new", percentage: 70 },
          ]),
          deployment([{ version_id: "v-older", percentage: 100 }]),
        ],
      }),
      versions: {
        "v-new": ok(version("v-new", { "workers/tag": "v4.0.0-beta.1" })),
      },
    });
    const read = readLiveState(cf, WORKER, DATABASE);
    expect(read).toMatchObject({
      ok: true,
      state: { kind: "version", version: "4.0.0-beta.1" },
    });
    expect(calls[1]).toContain("v-new");
  });

  it("falls to D1 when there is no deployment", () => {
    const { cf, calls } = fakeCf({
      deployments: ok({ deployments: [] }),
      ...MIGRATED,
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "pre-gate" },
      via: "no-deployment",
    });
    expect(calls.slice(1)).toEqual([
      ["d1", "query", DATABASE, "--sql", TABLE_EXISTS_SQL],
      ["d1", "query", DATABASE, "--sql", MIGRATION_COUNT_SQL],
    ]);
  });

  it("falls to D1 when the version has no tag", () => {
    const { cf } = fakeCf({
      deployments: ok({
        deployments: [deployment([{ version_id: "v-1", percentage: 100 }])],
      }),
      versions: {
        "v-1": ok(
          version("v-1", { "workers/message": "Automatic deployment" }),
        ),
      },
      ...MIGRATED,
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "pre-gate" },
      via: "no-tag",
    });
  });

  it("falls to D1 when the version has no annotations at all", () => {
    const { cf } = fakeCf({
      deployments: ok({
        deployments: [deployment([{ version_id: "v-1", percentage: 100 }])],
      }),
      versions: { "v-1": ok(version("v-1")) },
    });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "fresh" },
      via: "no-tag",
    });
  });

  it("falls to D1 when the tag is not a version", () => {
    for (const tag of [
      "production",
      "3.12.1",
      "v3.12",
      "vv3.12.1",
      "v03.1.0",
    ]) {
      const { cf } = fakeCf({
        deployments: ok({
          deployments: [deployment([{ version_id: "v-1", percentage: 100 }])],
        }),
        versions: { "v-1": ok(version("v-1", { "workers/tag": tag })) },
        ...MIGRATED,
      });
      expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
        ok: true,
        state: { kind: "pre-gate" },
        via: "tag-not-version",
        tag,
      });
    }
  });

  it("falls to D1 when the Worker does not exist (error 10007)", () => {
    const { cf } = fakeCf({ deployments: NO_WORKER });
    expect(readLiveState(cf, WORKER, DATABASE)).toEqual({
      ok: true,
      state: { kind: "fresh" },
      via: "no-worker",
    });
  });

  it("reads a fresh install from a missing or an empty migrations table", () => {
    expect(
      readLiveState(fakeCf({ table: d1([]) }).cf, WORKER, DATABASE),
    ).toMatchObject({
      ok: true,
      state: { kind: "fresh" },
    });
    const empty = fakeCf({
      table: d1([{ name: "d1_migrations" }]),
      count: d1([{ n: 0 }]),
    });
    expect(readLiveState(empty.cf, WORKER, DATABASE)).toMatchObject({
      ok: true,
      state: { kind: "fresh" },
    });
    expect(empty.calls).toHaveLength(3);
  });

  it("fails by name when reading the deployments fails", () => {
    const { cf } = fakeCf({
      deployments: exit("✘ [10000] Authentication error\n"),
    });
    const read = readLiveState(cf, WORKER, DATABASE);
    expect(read).toEqual({
      ok: false,
      failure: {
        read: "读取线上部署",
        command: `cf workers deployments list --worker ${WORKER}`,
        detail: "退出码 1，输出：\n✘ [10000] Authentication error",
      },
    });
  });

  it("fails when the version read fails, without looking at D1", () => {
    const { cf, calls } = fakeCf({
      deployments: ok({
        deployments: [deployment([{ version_id: "v-1", percentage: 100 }])],
      }),
    });
    const read = readLiveState(cf, WORKER, DATABASE);
    expect(read).toMatchObject({
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
    const read = readLiveState(cf, WORKER, DATABASE);
    expect(read).toMatchObject({
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
        "第一条部署没有任何版本",
      ],
      [
        {
          deployments: ok({
            deployments: [deployment([{ version_id: "v-1" } as never])],
          }),
        },
        "缺少 version_id 或 percentage",
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

  it("reads no names when the Worker does not exist", () => {
    expect(readSecretNames(fakeCf({ secrets: NO_WORKER }).cf, WORKER)).toEqual({
      ok: true,
      names: [],
    });
  });

  it("fails by name on any other failure", () => {
    expect(
      readSecretNames(
        fakeCf({ secrets: exit("✘ [10000] Authentication error") }).cf,
        WORKER,
      ),
    ).toMatchObject({
      ok: false,
      failure: { read: "读取 Worker 的 Secret 名称" },
    });
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
  it("reads v plus a canonical version only", () => {
    expect(tagVersion("v3.12.1")).toBe("3.12.1");
    expect(tagVersion("v0.0.0-probe.1")).toBe("0.0.0-probe.1");
    expect(tagVersion("3.12.1")).toBeNull();
    expect(tagVersion("vv3.12.1")).toBeNull();
    expect(tagVersion("v3.12.1+build")).toBeNull();
  });
});
