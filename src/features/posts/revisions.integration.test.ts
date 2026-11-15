import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createMockExecutionCtx,
  seedAdminApiKey,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as MediaRepo from "@/features/media/data/media.data";
import { fetchVideoMeta } from "@/features/posts/services/video-meta.service";
import { MediaTable, PostRevisionsTable, PostsTable } from "@/lib/db/schema";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

/**
 * Discarding Unpublished Changes and restoring Post Revisions over the Admin
 * HTTP API, for bodies written as JSON and as Markdown (ADR 0032).
 */

vi.mock("@/features/posts/services/video-meta.service", () => ({
  fetchVideoMeta: vi.fn(),
}));

// Runs once, after a restore has read the Post and before it writes, to land
// a save in between.
const beforeRestoreWrite = vi.hoisted(() => ({
  run: null as null | (() => Promise<void>),
}));

vi.mock("@/features/posts/data/post-revisions.data", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/posts/data/post-revisions.data")
    >();
  return {
    ...actual,
    restorePostSnapshot: async (
      ...args: Parameters<typeof actual.restorePostSnapshot>
    ) => {
      const run = beforeRestoreWrite.run;
      beforeRestoreWrite.run = null;
      await run?.();
      return actual.restorePostSnapshot(...args);
    },
  };
});

beforeEach(async () => {
  // The bodies show this Media by its path, which must exist.
  await MediaRepo.insertMedia(createAdminTestContext().db, {
    key: "cover.png",
    url: "/images/cover.png",
    fileName: "cover.png",
    mimeType: "image/png",
    sizeInBytes: 10,
  });
  beforeRestoreWrite.run = null;
  vi.mocked(fetchVideoMeta).mockReset();
  vi.mocked(fetchVideoMeta).mockResolvedValue({
    title: "A Bilibili video",
    cover: "https://i0.hdslb.com/bfs/archive/cover.jpg",
    duration: 321,
  });
});

const BODIES: Record<string, string> = {
  bold: "Some **bold** text.",
  italic: "Some *italic* text.",
  "inline code": "Some `inline code` text.",
  link: "A [link](https://example.com/page) here.",
  "code block": "```ts\nconst answer = 42;\n```",
  table: "| A | B |\n| :-- | --: |\n| 1 | 2 |",
  math: "Inline $x^2$ and a block:\n\n$$\n\\frac{a}{b}\n$$",
  image: "![a cover](/images/cover.png)",
  video: "https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2&t=90",
  everything: [
    "## Intro",
    "Some **bold**, *italic*, ***both***, `code` and [a link](https://example.com).",
    "- a **list** item\n- another",
    "> a *quote*",
    "```ts\nconst answer = 42;\n```",
    "| A | B |\n| :-- | --: |\n| **1** | `2` |",
    "Inline $x^2$.",
    "$$\n\\frac{a}{b}\n$$",
    "![a cover](/images/cover.png)",
    "https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2&t=90",
  ].join("\n\n"),
};

type WriteFormat = "json" | "markdown";
const FORMATS: Array<WriteFormat> = ["json", "markdown"];

type AdminPost = {
  id: number;
  title: string;
  summary: string | null;
  saveToken: string;
  contentJson: unknown;
  hasUnpublishedChanges: boolean;
  cover: unknown;
};

type Revision = { id: number; reason: string; title: string };

async function callAdminApi(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  const headers = new Headers({ "x-api-key": apiKey });
  let body: string | undefined;
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }
  const request = new Request(`http://localhost:3000/api${path}`, {
    method: init.method ?? "GET",
    headers,
    body,
  });
  const { response } = await openAPIHandler.handle(request, {
    prefix: "/api",
    context: createApiContext(request.headers, env, createMockExecutionCtx()),
  });
  if (!response) throw new Error(`No route matched ${request.method} ${path}`);
  return response;
}

async function readPost(apiKey: string, id: number) {
  const response = await callAdminApi(apiKey, `/admin/posts/${id}`);
  expect(response.status).toBe(200);
  return (await response.json()) as AdminPost;
}

async function patchPost(
  apiKey: string,
  id: number,
  data: Record<string, unknown>,
) {
  const response = await callAdminApi(apiKey, `/admin/posts/${id}`, {
    method: "PATCH",
    body: { data },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as AdminPost;
}

async function createPost(apiKey: string, title: string) {
  const response = await callAdminApi(apiKey, "/admin/posts", {
    method: "POST",
    body: { data: { title } },
  });
  expect(response.status).toBe(200);
  return ((await response.json()) as { id: number }).id;
}

/**
 * The editor's JSON for `markdown`, as the server converts it: what a JSON
 * client holding the same body would send.
 */
async function jsonOf(apiKey: string, markdown: string) {
  const id = await createPost(apiKey, "rv-convert");
  return (await patchPost(apiKey, id, { contentMarkdown: markdown }))
    .contentJson;
}

/** A post whose body was written in `format`. */
async function postWithBody(
  apiKey: string,
  title: string,
  markdown: string,
  format: WriteFormat,
) {
  const id = await createPost(apiKey, title);
  await patchPost(
    apiKey,
    id,
    format === "markdown"
      ? { contentMarkdown: markdown }
      : { contentJson: await jsonOf(apiKey, markdown) },
  );
  return id;
}

async function publish(apiKey: string, id: number) {
  const response = await callAdminApi(apiKey, `/admin/posts/${id}/publish`, {
    method: "POST",
    body: {},
  });
  expect(response.status).toBe(200);
}

async function listRevisions(apiKey: string, id: number) {
  const response = await callAdminApi(apiKey, `/admin/posts/${id}/revisions`);
  expect(response.status).toBe(200);
  return (await response.json()) as Array<Revision>;
}

function restore(
  apiKey: string,
  postId: number,
  revisionId: number,
  saveToken?: string,
) {
  return callAdminApi(
    apiKey,
    `/admin/posts/${postId}/revisions/${revisionId}/restore`,
    { method: "POST", body: saveToken === undefined ? {} : { saveToken } },
  );
}

describe.each(FORMATS)("a body written as %s", (format) => {
  describe.each(Object.entries(BODIES))("with %s", (name, markdown) => {
    it("discards Unpublished Changes back to what is published", async () => {
      const apiKey = await seedAdminApiKey();
      const id = await postWithBody(
        apiKey,
        `rv-discard ${name}`,
        markdown,
        format,
      );
      await publish(apiKey, id);
      const published = await readPost(apiKey, id);
      expect(published.hasUnpublishedChanges).toBe(false);

      await patchPost(apiKey, id, { summary: "changed summary" });
      expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(true);

      const response = await callAdminApi(
        apiKey,
        `/admin/posts/${id}/discard-changes`,
        { method: "POST", body: {} },
      );
      expect(response.status).toBe(200);

      const discarded = await readPost(apiKey, id);
      expect(discarded.summary).toBe(published.summary);
      expect(discarded.contentJson).toEqual(published.contentJson);
      expect(discarded.hasUnpublishedChanges).toBe(false);
    });

    it("has no Unpublished Changes when the body is written back as read", async () => {
      const apiKey = await seedAdminApiKey();
      const id = await postWithBody(
        apiKey,
        `rv-echo ${name}`,
        markdown,
        format,
      );
      await publish(apiKey, id);

      const asJson = await readPost(apiKey, id);
      expect(
        (await patchPost(apiKey, id, { contentJson: asJson.contentJson }))
          .hasUnpublishedChanges,
      ).toBe(false);

      const asMarkdown = (await (
        await callAdminApi(apiKey, `/admin/posts/${id}?contentFormat=markdown`)
      ).json()) as { contentMarkdown: string };
      expect(
        (
          await patchPost(apiKey, id, {
            contentMarkdown: asMarkdown.contentMarkdown,
          })
        ).hasUnpublishedChanges,
      ).toBe(false);
    });

    it("has no Unpublished Changes after restoring the live publish revision", async () => {
      const apiKey = await seedAdminApiKey();
      const id = await postWithBody(
        apiKey,
        `rv-restore ${name}`,
        markdown,
        format,
      );
      await publish(apiKey, id);
      await patchPost(apiKey, id, {
        summary: "changed summary",
        contentMarkdown: "A different body.",
      });
      expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(true);

      const [live] = (await listRevisions(apiKey, id)).filter(
        (revision) => revision.reason === "publish",
      );
      const response = await restore(apiKey, id, live.id);
      expect(response.status).toBe(200);

      expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
    });
  });
});

describe("a body stored with its keys out of the schema's order", () => {
  // As Markdown writes stored it before they were given a JSON write's shape:
  // text nodes with `text` ahead of `marks`.
  const unordered = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Some " },
          { type: "text", text: "bold", marks: [{ type: "bold" }] },
          {
            type: "text",
            text: " and a link",
            marks: [{ type: "link", attrs: { href: "https://example.com/" } }],
          },
        ],
      },
    ],
  };

  async function publishedUnordered(apiKey: string, title: string) {
    const id = await createPost(apiKey, title);
    const { db } = createAdminTestContext();
    await db
      .update(PostsTable)
      .set({ contentJson: unordered, draftFingerprint: null })
      .where(eq(PostsTable.id, id));
    await publish(apiKey, id);
    return id;
  }

  it("can still have its Unpublished Changes discarded", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await publishedUnordered(apiKey, "rv-unordered-discard");
    await patchPost(apiKey, id, { summary: "changed summary" });

    const response = await callAdminApi(
      apiKey,
      `/admin/posts/${id}/discard-changes`,
      { method: "POST", body: {} },
    );
    expect(response.status).toBe(200);
    const discarded = await readPost(apiKey, id);
    expect(discarded.summary).not.toBe("changed summary");
    expect(discarded.hasUnpublishedChanges).toBe(false);
  });

  it("has no Unpublished Changes after restoring its publish revision", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await publishedUnordered(apiKey, "rv-unordered-restore");
    await patchPost(apiKey, id, { contentMarkdown: "A different body." });

    const [live] = (await listRevisions(apiKey, id)).filter(
      (revision) => revision.reason === "publish",
    );
    expect((await restore(apiKey, id, live.id)).status).toBe(200);
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
  });

  it("settles a missing published fingerprint from its publish revision", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await publishedUnordered(apiKey, "rv-unordered-settle");
    const { db } = createAdminTestContext();
    await db
      .update(PostsTable)
      .set({ draftFingerprint: null, publishedFingerprint: null })
      .where(eq(PostsTable.id, id));

    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
  });
});

describe("restoring a Post Revision with a saveToken", () => {
  async function editedAfterPublish(apiKey: string, title: string) {
    const id = await postWithBody(apiKey, title, BODIES.everything, "markdown");
    await publish(apiKey, id);
    const edited = await patchPost(apiKey, id, { title: `${title} edited` });
    const [live] = (await listRevisions(apiKey, id)).filter(
      (revision) => revision.reason === "publish",
    );
    return { id, edited, revisionId: live.id };
  }

  it("restores with the current saveToken and answers a new one", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, edited, revisionId } = await editedAfterPublish(
      apiKey,
      "rv-guard-current",
    );

    const response = await restore(apiKey, id, revisionId, edited.saveToken);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      restored: boolean;
      post: { title: string; saveToken: string };
    };
    expect(body.restored).toBe(true);
    expect(body.post.title).toBe("rv-guard-current");
    expect(body.post.saveToken).not.toBe(edited.saveToken);
    expect((await readPost(apiKey, id)).saveToken).toBe(body.post.saveToken);
  });

  it("answers 409 EDIT_CONFLICT for a stale saveToken and writes nothing", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, edited, revisionId } = await editedAfterPublish(
      apiKey,
      "rv-guard-stale",
    );
    const newer = await patchPost(apiKey, id, { summary: "a newer save" });
    const revisionsBefore = await listRevisions(apiKey, id);

    const response = await restore(apiKey, id, revisionId, edited.saveToken);
    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      code: string;
      data: { saveToken: string };
    };
    expect(body.code).toBe("EDIT_CONFLICT");
    expect(body.data.saveToken).toBe(newer.saveToken);

    const after = await readPost(apiKey, id);
    expect(after.title).toBe("rv-guard-stale edited");
    expect(after.summary).toBe("a newer save");
    expect(after.saveToken).toBe(newer.saveToken);
    expect(await listRevisions(apiKey, id)).toEqual(revisionsBefore);
  });

  it("answers 409 EDIT_CONFLICT for a stale saveToken even when nothing would change", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await postWithBody(apiKey, "rv-guard-same", "Same.", "json");
    const stale = (await readPost(apiKey, id)).saveToken;
    await publish(apiKey, id);
    const current = (await readPost(apiKey, id)).saveToken;
    const [live] = await listRevisions(apiKey, id);

    const response = await restore(apiKey, id, live.id, stale);
    expect(response.status).toBe(409);
    expect(
      ((await response.json()) as { data: { saveToken: string } }).data
        .saveToken,
    ).toBe(current);
  });

  it("without a saveToken, restores over whatever the draft is when it starts", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, revisionId } = await editedAfterPublish(
      apiKey,
      "rv-guard-none",
    );
    await patchPost(apiKey, id, { summary: "a newer save" });

    expect((await restore(apiKey, id, revisionId)).status).toBe(200);
    expect((await readPost(apiKey, id)).title).toBe("rv-guard-none");
  });

  it("without a saveToken, answers 409 EDIT_CONFLICT for a save landing while it runs and writes nothing", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, revisionId } = await editedAfterPublish(
      apiKey,
      "rv-guard-race",
    );
    const revisionsBefore = await listRevisions(apiKey, id);
    let landed: AdminPost | undefined;
    beforeRestoreWrite.run = async () => {
      landed = await patchPost(apiKey, id, { summary: "landed mid-restore" });
    };

    const response = await restore(apiKey, id, revisionId);
    expect(landed).toBeDefined();
    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      code: string;
      data: { saveToken: string };
    };
    expect(body.code).toBe("EDIT_CONFLICT");
    expect(body.data.saveToken).toBe(landed!.saveToken);

    const after = await readPost(apiKey, id);
    expect(after.title).toBe("rv-guard-race edited");
    expect(after.summary).toBe("landed mid-restore");
    expect(after.saveToken).toBe(landed!.saveToken);
    expect(await listRevisions(apiKey, id)).toEqual(revisionsBefore);
  });
});

describe("reading a Post Revision", () => {
  async function publishRevisionOf(apiKey: string, format: WriteFormat) {
    const id = await postWithBody(
      apiKey,
      `rv-read ${format}`,
      BODIES.everything,
      format,
    );
    await publish(apiKey, id);
    const [live] = await listRevisions(apiKey, id);
    return { id, revisionId: live.id };
  }

  type RevisionRead = {
    id: number;
    snapshotJson: {
      title: string;
      contentJson?: unknown;
      contentMarkdown?: string | null;
    };
  };

  it.each(FORMATS)(
    "answers Markdown with contentFormat=markdown, for a body written as %s",
    async (format) => {
      const apiKey = await seedAdminApiKey();
      const { id, revisionId } = await publishRevisionOf(apiKey, format);
      const post = (await (
        await callAdminApi(apiKey, `/admin/posts/${id}?contentFormat=markdown`)
      ).json()) as { contentMarkdown: string };

      const response = await callAdminApi(
        apiKey,
        `/admin/posts/${id}/revisions/${revisionId}?contentFormat=markdown`,
      );
      expect(response.status).toBe(200);
      const revision = (await response.json()) as RevisionRead;
      expect(revision.id).toBe(revisionId);
      expect(revision.snapshotJson.title).toBe(`rv-read ${format}`);
      expect(revision.snapshotJson).not.toHaveProperty("contentJson");
      expect(revision.snapshotJson.contentMarkdown).toBe(post.contentMarkdown);
      expect(revision.snapshotJson.contentMarkdown).toContain("**bold**");
    },
  );

  it("answers JSON by default and with contentFormat=json", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, revisionId } = await publishRevisionOf(apiKey, "markdown");
    const post = await readPost(apiKey, id);

    for (const query of ["", "?contentFormat=json"]) {
      const response = await callAdminApi(
        apiKey,
        `/admin/posts/${id}/revisions/${revisionId}${query}`,
      );
      expect(response.status).toBe(200);
      const revision = (await response.json()) as RevisionRead;
      expect(revision.snapshotJson).not.toHaveProperty("contentMarkdown");
      expect(revision.snapshotJson.contentJson).toEqual(post.contentJson);
    }
  });

  it("answers the cover with its address, and null for no cover or a Media that is gone", async () => {
    const apiKey = await seedAdminApiKey();
    const db = createAdminTestContext().db;
    const media = await MediaRepo.insertMedia(db, {
      key: "rv-cover.png",
      url: "/images/rv-cover.png",
      fileName: "rv-cover.png",
      mimeType: "image/png",
      sizeInBytes: 10,
    });
    const id = await createPost(apiKey, "rv-cover");
    const coverOf = async (revisionId: number) =>
      (
        (await (
          await callAdminApi(
            apiKey,
            `/admin/posts/${id}/revisions/${revisionId}`,
          )
        ).json()) as { cover: unknown }
      ).cover;

    // No cover.
    await publish(apiKey, id);
    const [withoutCover] = await listRevisions(apiKey, id);
    expect(await coverOf(withoutCover.id)).toBeNull();

    // A cover, as the post read gives it for the draft.
    await patchPost(apiKey, id, { coverMediaId: media.id });
    const draft = await readPost(apiKey, id);
    await publish(apiKey, id);
    const [withCover] = await listRevisions(apiKey, id);
    expect(await coverOf(withCover.id)).toEqual(draft.cover);
    expect(draft.cover).toMatchObject({
      id: media.id,
      key: "rv-cover.png",
      url: "/images/rv-cover.png",
      fileName: "rv-cover.png",
    });

    // The Media is gone: the revision still names it, but there is no cover.
    await patchPost(apiKey, id, { coverMediaId: null });
    await db.delete(MediaTable).where(eq(MediaTable.id, media.id));
    expect(await coverOf(withCover.id)).toBeNull();
  });

  it("answers 404 POST_REVISION_NOT_FOUND for a missing revision", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await publishRevisionOf(apiKey, "json");
    const response = await callAdminApi(
      apiKey,
      `/admin/posts/${id}/revisions/999999?contentFormat=markdown`,
    );
    expect(response.status).toBe(404);
    expect(((await response.json()) as { code: string }).code).toBe(
      "POST_REVISION_NOT_FOUND",
    );
  });
});

describe("keeping the newest Post Revisions", () => {
  /**
   * `count` legacy autosave revisions of Post `id`, a minute apart and ending
   * an hour ago, written straight to the table so that none is trimmed.
   * Their ids, oldest first.
   */
  async function seedRevisions(id: number, count: number) {
    const db = createAdminTestContext().db;
    const start = Date.now() - 3_600_000 - count * 60_000;
    const ids: Array<number> = [];
    for (let i = 0; i < count; i++) {
      const [row] = await db
        .insert(PostRevisionsTable)
        .values({
          postId: id,
          reason: "auto",
          snapshotHash: `seed-${i}`,
          snapshotJson: {
            title: `seed ${i}`,
            summary: null,
            slug: `rv-seed-${id}-${i}`,
            status: "draft",
            publishedAt: null,
            contentJson: null,
            tagIds: [],
            categoryId: null,
            coverMediaId: null,
          },
          createdAt: new Date(start + i * 60_000),
        })
        .returning({ id: PostRevisionsTable.id });
      ids.push(row.id);
    }
    return ids;
  }

  const newestFirst = (ids: Array<number>) => [...ids].reverse();

  it("drops the oldest when publishing takes the 21st", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "rv-cap-publish");
    const seeded = await seedRevisions(id, 20);

    await publish(apiKey, id);

    const revisions = await listRevisions(apiKey, id);
    expect(revisions).toHaveLength(20);
    expect(revisions[0].reason).toBe("publish");
    expect(revisions.slice(1).map((revision) => revision.id)).toEqual(
      newestFirst(seeded.slice(1)),
    );
  });

  it("drops the oldest when a restore takes the 21st, even the one restored", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "rv-cap-restore");
    const seeded = await seedRevisions(id, 20);

    const response = await restore(apiKey, id, seeded[0]);
    expect(response.status).toBe(200);

    expect((await readPost(apiKey, id)).title).toBe("seed 0");
    const revisions = await listRevisions(apiKey, id);
    expect(revisions).toHaveLength(20);
    expect(revisions[0]).toMatchObject({
      reason: "restore_backup",
      title: "rv-cap-restore",
    });
    expect(revisions.slice(1).map((revision) => revision.id)).toEqual(
      newestFirst(seeded.slice(1)),
    );
  });

  it("drops the oldest when discarding Unpublished Changes takes the 21st", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "rv-cap-discard");
    await publish(apiKey, id);
    const seeded = await seedRevisions(id, 19);
    await patchPost(apiKey, id, { summary: "changed summary" });

    const response = await callAdminApi(
      apiKey,
      `/admin/posts/${id}/discard-changes`,
      { method: "POST", body: {} },
    );
    expect(response.status).toBe(200);

    const revisions = await listRevisions(apiKey, id);
    expect(revisions).toHaveLength(20);
    expect(revisions.map((revision) => revision.reason).slice(0, 2)).toEqual([
      "restore_backup",
      "publish",
    ]);
    expect(revisions.slice(2).map((revision) => revision.id)).toEqual(
      newestFirst(seeded.slice(1)),
    );
  });

  it("brings a Post with 25 down to its newest 20 at its next publish", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "rv-cap-over");
    const seeded = await seedRevisions(id, 25);
    expect(await listRevisions(apiKey, id)).toHaveLength(25);

    await publish(apiKey, id);

    const revisions = await listRevisions(apiKey, id);
    expect(revisions).toHaveLength(20);
    expect(revisions[0].reason).toBe("publish");
    expect(revisions.slice(1).map((revision) => revision.id)).toEqual(
      newestFirst(seeded.slice(6)),
    );
  });

  it("deletes no revision when a restore is refused with EDIT_CONFLICT", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "rv-cap-refused");
    const seeded = await seedRevisions(id, 25);
    const revisionsBefore = await listRevisions(apiKey, id);
    beforeRestoreWrite.run = async () => {
      await patchPost(apiKey, id, { summary: "landed mid-restore" });
    };

    const response = await restore(apiKey, id, seeded[24]);
    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe(
      "EDIT_CONFLICT",
    );

    const revisionsAfter = await listRevisions(apiKey, id);
    expect(revisionsAfter).toEqual(revisionsBefore);
    expect(
      revisionsAfter.some((revision) => revision.reason === "restore_backup"),
    ).toBe(false);
  });

  it("deletes no revision and writes no backup when a discard is refused with EDIT_CONFLICT", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "rv-cap-discard-refused");
    await publish(apiKey, id);
    await seedRevisions(id, 25);
    await patchPost(apiKey, id, { summary: "changed summary" });
    const revisionsBefore = await listRevisions(apiKey, id);
    beforeRestoreWrite.run = async () => {
      await patchPost(apiKey, id, { summary: "landed mid-discard" });
    };

    const response = await callAdminApi(
      apiKey,
      `/admin/posts/${id}/discard-changes`,
      { method: "POST", body: {} },
    );
    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe(
      "EDIT_CONFLICT",
    );

    const revisionsAfter = await listRevisions(apiKey, id);
    expect(revisionsAfter).toHaveLength(26);
    expect(revisionsAfter).toEqual(revisionsBefore);
    expect(
      revisionsAfter.some((revision) => revision.reason === "restore_backup"),
    ).toBe(false);
  });

  it("keeps the higher id of two revisions taken in the same second", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "rv-cap-tie");
    const seeded = await seedRevisions(id, 20);
    // The two oldest now share a createdAt; only their ids tell them apart.
    const [oldest] = await createAdminTestContext()
      .db.select({ createdAt: PostRevisionsTable.createdAt })
      .from(PostRevisionsTable)
      .where(eq(PostRevisionsTable.id, seeded[0]));
    await createAdminTestContext()
      .db.update(PostRevisionsTable)
      .set({ createdAt: oldest.createdAt })
      .where(eq(PostRevisionsTable.id, seeded[1]));

    await publish(apiKey, id);

    const ids = (await listRevisions(apiKey, id)).map(
      (revision) => revision.id,
    );
    expect(ids).toHaveLength(20);
    expect(ids).toContain(seeded[1]);
    expect(ids).not.toContain(seeded[0]);
  });
});
