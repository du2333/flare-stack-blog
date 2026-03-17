import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { CommentStatus, PostStatus } from "../../src/lib/db/schema";
import { COMMENT_STATUSES, POST_STATUSES } from "../../src/lib/db/schema";
import { parseWranglerJson } from "./parse-wrangler-json";

type D1ExecuteResult<Row> = Array<{
  results: Array<Row>;
  success: boolean;
}>;

type Target = "local" | "remote";

type PostStatusCountKey = `${PostStatus}Posts`;
type CommentStatusCountKey = `${CommentStatus}Comments`;

type PostSummary = {
  totalPosts: number;
} & Record<PostStatusCountKey, number>;

type CommentSummary = {
  totalComments: number;
  rootComments: number;
  replyComments: number;
} & Record<CommentStatusCountKey, number>;

type SafetySummary = {
  comments: CommentSummary;
  posts: PostSummary;
};

type TablePresence = {
  hasComments: boolean;
  hasD1Migrations: boolean;
  hasPosts: boolean;
};

type VerificationPlan =
  | {
      kind: "fresh";
      tables: TablePresence;
    }
  | {
      kind: "verify";
      tables: TablePresence;
    };

type LocalRestorePoint = {
  kind: "local";
  snapshotPath: string;
  persistTo: string;
};

type RemoteRestorePoint = {
  kind: "remote";
  bookmark: string;
  timestamp: string;
};

type RestorePoint = LocalRestorePoint | RemoteRestorePoint;

type ParsedArgs = {
  autoRollback: boolean;
  database: string;
  persistTo?: string;
  target: Target;
  withExport: boolean;
};

const cwd = process.cwd();
const tmpDir = path.join(cwd, "tmp");
const defaultLocalPersistTo = path.join(cwd, ".wrangler/state");

function parseArgs(argv: Array<string>): ParsedArgs {
  let database = "DB";
  let target: Target = "remote";
  let persistTo: string | undefined;
  let autoRollback = true;
  let withExport = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--db") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --db");
      }
      database = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--persist-to") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --persist-to");
      }
      persistTo = path.resolve(cwd, nextValue);
      index += 1;
      continue;
    }

    if (arg === "--local") {
      target = "local";
      continue;
    }

    if (arg === "--remote") {
      target = "remote";
      continue;
    }

    if (arg === "--no-rollback") {
      autoRollback = false;
      continue;
    }

    if (arg === "--with-export") {
      withExport = true;
      continue;
    }

    if (!arg.startsWith("-")) {
      database = arg;
    }
  }

  return { autoRollback, database, persistTo, target, withExport };
}

function printHelp() {
  console.log(`Safe D1 migration runner

Usage:
  bun scripts/safe-d1-migrate/main.ts [DB_BINDING]
  bun scripts/safe-d1-migrate/main.ts --db DB_BINDING --remote
  bun scripts/safe-d1-migrate/main.ts --db DB_BINDING --remote [--with-export]
  bun scripts/safe-d1-migrate/main.ts --db DB_BINDING --local [--persist-to .wrangler/state]

Options:
  --remote         Migrate a remote D1 database and auto-rollback with Time Travel on verification failure
  --local          Migrate a local D1 database and auto-rollback by restoring the local persistence directory
  --with-export    Also export SQL before migrating. Mainly useful for manual incident analysis
  --persist-to     Local D1 persistence root. Defaults to .wrangler/state when using --local
  --no-rollback    Disable automatic rollback after verification failure

What it verifies:
  - posts: total count plus counts for each schema-defined post status
  - comments: total/root/reply counts plus counts for each schema-defined comment status
`);
}

function ensureWorkingDirs() {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function timestampLabel(date = new Date()) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function wranglerEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CI: "1",
  };
}

function formatCommand(args: Array<string>) {
  return ["bunx", "wrangler", ...args].join(" ");
}

function runWrangler(args: Array<string>) {
  console.log(`$ ${formatCommand(args)}`);

  const result = spawnSync("bunx", ["wrangler", ...args], {
    cwd,
    env: wranglerEnv(),
    encoding: "utf8",
  });

  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  if (stdout) {
    console.log(stdout);
  }

  if (stderr) {
    console.error(stderr);
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: ${formatCommand(args)}`);
  }

  return stdout;
}

function runWranglerJson<T>(args: Array<string>) {
  const output = runWrangler([...args, "--json"]);
  return parseWranglerJson<T>(output);
}

function d1ScopeArgs(target: Target, persistTo?: string) {
  const args = [target === "remote" ? "--remote" : "--local"];
  if (target === "local" && persistTo) {
    args.push("--persist-to", persistTo);
  }
  return args;
}

function writeQueryFile(sql: string) {
  const queryPath = path.join(
    tmpDir,
    `d1-query-${timestampLabel()}-${Math.random().toString(36).slice(2, 8)}.sql`,
  );
  fs.writeFileSync(queryPath, `${sql.trim()}\n`);
  return queryPath;
}

function executeSingleRow<Row extends Record<string, number | string | null>>(
  database: string,
  sql: string,
  target: Target,
  persistTo?: string,
) {
  const rows = executeRows<Row>(database, sql, target, persistTo);
  const row = rows[0];
  if (!row) {
    throw new Error(`Query returned no rows: ${sql}`);
  }

  return row;
}

function executeRows<Row extends Record<string, number | string | null>>(
  database: string,
  sql: string,
  target: Target,
  persistTo?: string,
) {
  const queryPath = writeQueryFile(sql);

  try {
    const output = runWranglerJson<D1ExecuteResult<Row>>([
      "d1",
      "execute",
      database,
      ...d1ScopeArgs(target, persistTo),
      "--file",
      queryPath,
    ]);

    return output[0]?.results ?? [];
  } finally {
    fs.rmSync(queryPath, { force: true });
  }
}

function toNumberRecord<T extends Record<string, number>>(
  row: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value ?? 0)]),
  ) as T;
}

function statusCountSelectClauses<
  TStatus extends string,
  TSuffix extends string,
>(statuses: ReadonlyArray<TStatus>, tableName: string, suffix: TSuffix) {
  return statuses.map(
    (status) =>
      `coalesce(sum(case when ${tableName}.status = '${status}' then 1 else 0 end), 0) as ${status}${suffix}`,
  );
}

function collectSafetySummary(
  database: string,
  target: Target,
  persistTo?: string,
): SafetySummary {
  const postStatusClauses = statusCountSelectClauses(
    POST_STATUSES,
    "posts",
    "Posts",
  );
  const commentStatusClauses = statusCountSelectClauses(
    COMMENT_STATUSES,
    "comments",
    "Comments",
  );

  const posts = toNumberRecord<PostSummary>(
    executeSingleRow(
      database,
      `
        select
          count(*) as totalPosts,
          ${postStatusClauses.join(",\n          ")}
        from posts
      `,
      target,
      persistTo,
    ),
  );

  const comments = toNumberRecord<CommentSummary>(
    executeSingleRow(
      database,
      `
        select
          count(*) as totalComments,
          coalesce(sum(case when comments.root_id is null then 1 else 0 end), 0) as rootComments,
          coalesce(sum(case when comments.root_id is not null then 1 else 0 end), 0) as replyComments,
          ${commentStatusClauses.join(",\n          ")}
        from comments
      `,
      target,
      persistTo,
    ),
  );

  return { posts, comments };
}

function inspectTablePresence(
  database: string,
  target: Target,
  persistTo?: string,
): TablePresence {
  const row = executeSingleRow<{
    hasComments: number;
    hasD1Migrations: number;
    hasPosts: number;
  }>(
    database,
    `
      select
        max(case when name = 'posts' then 1 else 0 end) as hasPosts,
        max(case when name = 'comments' then 1 else 0 end) as hasComments,
        max(case when name = 'd1_migrations' then 1 else 0 end) as hasD1Migrations
      from sqlite_master
      where type = 'table'
        and name in ('posts', 'comments', 'd1_migrations')
    `,
    target,
    persistTo,
  );

  return {
    hasComments: Number(row.hasComments) === 1,
    hasD1Migrations: Number(row.hasD1Migrations) === 1,
    hasPosts: Number(row.hasPosts) === 1,
  };
}

function resolveVerificationPlan(tables: TablePresence): VerificationPlan {
  if (!tables.hasPosts && !tables.hasComments && !tables.hasD1Migrations) {
    return {
      kind: "fresh",
      tables,
    };
  }

  if (tables.hasPosts && tables.hasComments) {
    return {
      kind: "verify",
      tables,
    };
  }

  throw new Error(
    `Unexpected database schema state before migration. Found tables: posts=${tables.hasPosts}, comments=${tables.hasComments}, d1_migrations=${tables.hasD1Migrations}`,
  );
}

function writeSummary(label: string, stamp: string, summary: SafetySummary) {
  const outputPath = path.join(tmpDir, `d1-migrate-${label}-${stamp}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  return outputPath;
}

function diffSummary(before: SafetySummary, after: SafetySummary) {
  const diffs: Array<string> = [];

  for (const section of ["posts", "comments"] as const) {
    const beforeSection = before[section] as Record<string, number>;
    const afterSection = after[section] as Record<string, number>;

    for (const [key, beforeValue] of Object.entries(beforeSection)) {
      const afterValue = afterSection[key];
      if (beforeValue !== afterValue) {
        diffs.push(`${section}.${key}: ${beforeValue} -> ${afterValue}`);
      }
    }
  }

  return diffs;
}

function captureRemoteRestorePoint(database: string): RemoteRestorePoint {
  const timestamp = new Date().toISOString();
  const payload = runWranglerJson<{ bookmark: string }>([
    "d1",
    "time-travel",
    "info",
    database,
    "--timestamp",
    timestamp,
  ]);

  return {
    bookmark: payload.bookmark,
    kind: "remote",
    timestamp,
  };
}

function ensureLocalPersistenceExists(persistTo: string) {
  if (!fs.existsSync(persistTo)) {
    throw new Error(
      `Local persistence directory does not exist: ${persistTo}\nRun wrangler locally once or pass --persist-to to the correct path.`,
    );
  }
}

function captureLocalRestorePoint(
  stamp: string,
  persistTo: string,
): LocalRestorePoint {
  ensureLocalPersistenceExists(persistTo);
  const snapshotPath = path.join(
    tmpDir,
    `local-d1-state-before-migrate-${stamp}`,
  );
  fs.cpSync(persistTo, snapshotPath, { recursive: true });

  return {
    kind: "local",
    persistTo,
    snapshotPath,
  };
}

function restoreRemote(database: string, restorePoint: RemoteRestorePoint) {
  runWrangler([
    "d1",
    "time-travel",
    "restore",
    database,
    "--bookmark",
    restorePoint.bookmark,
  ]);
}

function restoreLocal(restorePoint: LocalRestorePoint) {
  fs.rmSync(restorePoint.persistTo, { force: true, recursive: true });
  fs.cpSync(restorePoint.snapshotPath, restorePoint.persistTo, {
    recursive: true,
  });
}

function restoreDatabase(database: string, restorePoint: RestorePoint) {
  if (restorePoint.kind === "remote") {
    restoreRemote(database, restorePoint);
    return;
  }

  restoreLocal(restorePoint);
}

function describeTarget(target: Target, persistTo?: string) {
  if (target === "remote") {
    return "remote";
  }

  return `local (persist-to: ${persistTo ?? defaultLocalPersistTo})`;
}

function backupDatabase(
  database: string,
  target: Target,
  backupPath: string,
  withExport: boolean,
  persistTo?: string,
) {
  if (target === "local") {
    console.log(
      `Skipping SQL export for local D1. Filesystem snapshot is the source of truth backup${persistTo ? `: ${persistTo}` : "."}`,
    );
    return;
  }

  if (!withExport) {
    console.log(
      "Skipping remote SQL export. Time Travel bookmark is the rollback safety net.",
    );
    return;
  }

  runWrangler([
    "d1",
    "export",
    database,
    ...d1ScopeArgs(target, persistTo),
    "--output",
    backupPath,
  ]);
}

function tryBackupDatabase(
  database: string,
  target: Target,
  backupPath: string,
  withExport: boolean,
  persistTo?: string,
) {
  try {
    backupDatabase(database, target, backupPath, withExport, persistTo);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (target === "remote") {
      console.warn(
        `Remote SQL export failed. Continuing with Time Travel as the rollback safety net.\n${message}`,
      );
      return false;
    }

    throw error;
  }
}

function applyMigrations(database: string, target: Target, persistTo?: string) {
  runWrangler([
    "d1",
    "migrations",
    "apply",
    database,
    ...d1ScopeArgs(target, persistTo),
  ]);
}

async function main() {
  ensureWorkingDirs();

  const { autoRollback, database, persistTo, target, withExport } = parseArgs(
    process.argv.slice(2),
  );
  const effectivePersistTo =
    target === "local" ? (persistTo ?? defaultLocalPersistTo) : undefined;
  const stamp = timestampLabel();
  const backupPath = path.join(
    tmpDir,
    `d1-${target}-backup-before-migrate-${stamp}.sql`,
  );

  console.log(`Using D1 binding: ${database}`);
  console.log(`Target: ${describeTarget(target, effectivePersistTo)}`);
  if (target === "local") {
    console.log("Backup mode: local filesystem snapshot");
  } else if (withExport) {
    console.log(`Backup mode: Time Travel + SQL export (${backupPath})`);
  } else {
    console.log("Backup mode: Time Travel bookmark only");
  }

  const backupCaptured = tryBackupDatabase(
    database,
    target,
    backupPath,
    withExport,
    effectivePersistTo,
  );

  const restorePoint =
    target === "remote"
      ? captureRemoteRestorePoint(database)
      : captureLocalRestorePoint(
          stamp,
          effectivePersistTo ?? defaultLocalPersistTo,
        );

  if (restorePoint.kind === "remote") {
    console.log(
      `Captured remote restore bookmark for ${restorePoint.timestamp}: ${restorePoint.bookmark}`,
    );
    if (withExport && !backupCaptured) {
      console.log(
        "Remote SQL backup unavailable; Time Travel bookmark will be used for rollback.",
      );
    }
  } else {
    console.log(
      `Captured local persistence snapshot: ${restorePoint.snapshotPath}`,
    );
  }

  const verificationPlan = resolveVerificationPlan(
    inspectTablePresence(database, target, effectivePersistTo),
  );

  let before: SafetySummary | null = null;
  if (verificationPlan.kind === "verify") {
    before = collectSafetySummary(database, target, effectivePersistTo);
    const beforeSummaryPath = writeSummary("before", stamp, before);
    console.log(`Saved pre-migration summary: ${beforeSummaryPath}`);
    console.log(JSON.stringify(before, null, 2));
  } else {
    console.log(
      "Fresh database detected. Skipping pre-migration count verification because posts/comments tables do not exist yet.",
    );
  }

  let migrationApplied = false;

  try {
    applyMigrations(database, target, effectivePersistTo);
    migrationApplied = true;

    const after = collectSafetySummary(database, target, effectivePersistTo);
    const afterSummaryPath = writeSummary("after", stamp, after);
    console.log(`Saved post-migration summary: ${afterSummaryPath}`);
    console.log(JSON.stringify(after, null, 2));

    if (before) {
      const diffs = diffSummary(before, after);
      if (diffs.length > 0) {
        throw new Error(
          `Safety verification failed.\n${diffs.map((diff) => `- ${diff}`).join("\n")}`,
        );
      }

      console.log(
        "Safety verification passed. Post and comment counts are unchanged.",
      );
    }
    if (!before) {
      console.log(
        "Initial migration completed on a fresh database. Post-migration summary captured.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);

    if (!migrationApplied || !autoRollback) {
      process.exit(1);
    }

    console.error("Attempting automatic rollback...");

    try {
      restoreDatabase(database, restorePoint);
      console.error("Automatic rollback completed.");
    } catch (rollbackError) {
      const rollbackMessage =
        rollbackError instanceof Error
          ? rollbackError.message
          : String(rollbackError);
      console.error(`Automatic rollback failed: ${rollbackMessage}`);

      if (restorePoint.kind === "remote") {
        console.error(
          `Manual restore command: bunx wrangler d1 time-travel restore ${database} --bookmark ${restorePoint.bookmark}`,
        );
      } else {
        console.error(
          `Manual local snapshot path: ${restorePoint.snapshotPath}`,
        );
        console.error(`Local persistence directory: ${restorePoint.persistTo}`);
      }
    }

    process.exit(1);
  }
}

if (import.meta.main) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
