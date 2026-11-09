import { env } from "cloudflare:workers";
import { createAdminTestContext, seedUser } from "tests/test-utils";
import { describe, expect, it } from "vitest";
import * as MomentService from "@/features/moments/services/moments.service";
import * as PostService from "@/features/posts/services/posts.service";
import { unwrap } from "@/lib/errors";

/**
 * Migration 0033 on a database as it was before it: every Comment on a Post,
 * `post_id` NOT NULL and no `moment_id`.
 */

async function run(query: string, ...params: Array<unknown>) {
  await env.DB.prepare(query)
    .bind(...params)
    .run();
}

async function all<T>(query: string, ...params: Array<unknown>) {
  return (
    await env.DB.prepare(query)
      .bind(...params)
      .all<T>()
  ).results;
}

/** The comments table as migrations 0005, 0012 and 0022 left it. */
async function restoreTableBefore0033() {
  await run("DROP TABLE `comments`");
  await run(`CREATE TABLE \`comments\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`content\` text,
	\`root_id\` integer,
	\`reply_to_comment_id\` integer,
	\`status\` text DEFAULT 'verifying' NOT NULL,
	\`post_id\` integer NOT NULL,
	\`user_id\` text,
	\`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
	\`updated_at\` integer DEFAULT (unixepoch()) NOT NULL,
	\`handled_at\` integer,
	FOREIGN KEY (\`root_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`reply_to_comment_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON UPDATE no action ON DELETE set null
)`);
  for (const index of [
    "CREATE INDEX `comments_post_root_created_idx` ON `comments` (`post_id`,`root_id`,`created_at`)",
    "CREATE INDEX `comments_user_created_idx` ON `comments` (`user_id`,`created_at`)",
    "CREATE INDEX `comments_status_created_idx` ON `comments` (`status`,`created_at`)",
    "CREATE INDEX `comments_global_created_idx` ON `comments` (`created_at`)",
  ]) {
    await run(index);
  }
}

async function applyMigration() {
  const migration = env.TEST_MIGRATIONS.find((item) =>
    item.name.startsWith("0033_"),
  );
  expect(migration).toBeDefined();
  for (const query of migration!.queries) await env.DB.prepare(query).run();
}

const SELECT_ALL =
  "SELECT id, content, root_id, reply_to_comment_id, status, post_id, user_id, handled_at, created_at, updated_at FROM comments ORDER BY id";

describe("Migration 0033 (comments on Moments)", () => {
  it("keeps every Comment, id and index, each still on its Post", async () => {
    const admin = createAdminTestContext();
    await seedUser(admin.db, admin.session.user);
    const { id: postId } = await PostService.createEmptyPost(admin);
    const userId = admin.session.user.id;

    await restoreTableBefore0033();
    await run(
      `INSERT INTO comments (id, content, root_id, reply_to_comment_id, status, post_id, user_id, handled_at, created_at, updated_at) VALUES
       (3, 'root', NULL, NULL, 'published', ?1, ?2, NULL, 100, 100),
       (8, 'reply', 3, 3, 'published', ?1, ?2, 200, 110, 120),
       (12, 'gone', 3, 8, 'deleted', ?1, NULL, NULL, 130, 140)`,
      postId,
      userId,
    );
    const before = await all(SELECT_ALL);

    await applyMigration();

    expect(await all(SELECT_ALL)).toEqual(before);
    expect(
      await all<{ moment_id: number | null }>("SELECT moment_id FROM comments"),
    ).toEqual([{ moment_id: null }, { moment_id: null }, { moment_id: null }]);

    const indexes = await all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'comments' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    expect(indexes.map((index) => index.name)).toEqual([
      "comments_global_created_idx",
      "comments_moment_root_created_idx",
      "comments_post_root_created_idx",
      "comments_status_created_idx",
      "comments_user_created_idx",
    ]);

    // New Comments continue after the kept ids, and may be on a Moment.
    const moment = unwrap(
      await MomentService.createMoment(admin, { text: "after" }),
    );
    await run(
      "INSERT INTO comments (content, moment_id, user_id) VALUES ('new', ?, ?)",
      moment.id,
      userId,
    );
    const [created] = await all<{ id: number; status: string }>(
      "SELECT id, status FROM comments WHERE moment_id = ?",
      moment.id,
    );
    expect(created.id).toBeGreaterThan(12);
    expect(created.status).toBe("published");

    // Exactly one target.
    await expect(
      run(
        "INSERT INTO comments (content, post_id, moment_id) VALUES ('both', ?, ?)",
        postId,
        moment.id,
      ),
    ).rejects.toThrow(/CHECK constraint failed/);
    await expect(
      run("INSERT INTO comments (content) VALUES ('neither')"),
    ).rejects.toThrow(/CHECK constraint failed/);

    // Thread links still cascade within the rebuilt table.
    await run("DELETE FROM comments WHERE id = 3");
    expect(
      await all("SELECT id FROM comments WHERE post_id = ?", postId),
    ).toEqual([]);
  });
});
