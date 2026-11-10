import { env } from "cloudflare:workers";
import {
  createAdminTestContext,
  createMockExecutionCtx,
  seedAdminApiKey,
} from "tests/test-utils";
import { describe, expect, it } from "vitest";
import {
  CategoriesTable,
  PostsTable,
  PostTagsTable,
  TagsTable,
} from "@/lib/db/schema";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";
import { unwrap } from "@/lib/errors";
import * as PostService from "@/features/posts/services/posts.service";
import * as TagService from "@/features/tags/tags.service";

/**
 * Exercises the Admin HTTP API the way an external editor (script, agent,
 * desktop client) calls it: Admin API Key in `x-api-key` and no browser
 * session. Covers creating drafts that carry content and reading whole posts
 * back out of the list endpoint.
 */

const MARK = "zz-strict";

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

type AdminContext = ReturnType<typeof createAdminTestContext>;

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

async function listPosts(apiKey: string, query: string) {
  const response = await callAdminApi(apiKey, `/admin/posts?${query}`);
  expect(response.status).toBe(200);
  return (await response.json()) as {
    items: Array<{
      id: number;
      title: string;
      summary: string | null;
      slug: string;
      publicSlug: string | null;
      contentJson?: unknown;
      category: { id: number; name: string } | null;
      tags: Array<{ id: number; name: string }>;
    }>;
    total: number;
    statusCounts: { draft: number; published: number };
  };
}

async function createPostWithBody(
  context: AdminContext,
  index: number,
): Promise<number> {
  const { id } = await PostService.createEmptyPost(context);
  unwrap(
    await PostService.updatePost(context, {
      id,
      data: {
        title: `Post ${index}`,
        slug: `post-${index}`,
        contentJson: paragraph(`Body ${index}`),
      },
    }),
  );
  return id;
}

describe("Admin posts API for external editors", () => {
  it("creates a new draft when the request carries content", async () => {
    const apiKey = await seedAdminApiKey();

    const emptyDraftResponse = await callAdminApi(apiKey, "/admin/posts", {
      method: "POST",
    });
    expect(emptyDraftResponse.status).toBe(200);
    const emptyDraft = (await emptyDraftResponse.json()) as { id: number };

    const createResponse = await callAdminApi(apiKey, "/admin/posts", {
      method: "POST",
      body: {
        data: {
          title: "Written in Obsidian",
          summary: null,
          contentJson: paragraph("Hello from an external editor"),
        },
      },
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as { id: number };
    expect(created.id).not.toBe(emptyDraft.id);

    const readResponse = await callAdminApi(
      apiKey,
      `/admin/posts/${created.id}`,
    );
    expect(readResponse.status).toBe(200);
    const post = (await readResponse.json()) as {
      title: string;
      slug: string;
      summary: string | null;
      status: string;
      contentJson: unknown;
    };
    expect(post.title).toBe("Written in Obsidian");
    expect(post.slug).toBe("written-in-obsidian");
    expect(post.status).toBe("draft");
    expect(post.contentJson).toEqual(
      paragraph("Hello from an external editor"),
    );
    // A client that sent null has to read null back, or every sync after this
    // one sees a phantom difference between its note and the post.
    expect(post.summary).toBeNull();

    // The empty draft stayed untouched (and reusable) instead of being hijacked.
    const emptyResponse = await callAdminApi(
      apiKey,
      `/admin/posts/${emptyDraft.id}`,
    );
    const stillEmpty = (await emptyResponse.json()) as {
      title: string;
      contentJson: unknown;
    };
    expect(stillEmpty.title).toBe("");
    expect(stillEmpty.contentJson).toBeNull();
  });

  it("keeps the get-or-create empty draft behavior when no content is sent", async () => {
    const apiKey = await seedAdminApiKey();

    const first = (await (
      await callAdminApi(apiKey, "/admin/posts", { method: "POST" })
    ).json()) as { id: number };
    const second = (await (
      await callAdminApi(apiKey, "/admin/posts", {
        method: "POST",
        body: {},
      })
    ).json()) as { id: number };

    expect(second.id).toBe(first.id);
  });

  it("rejects content without a usable title", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callAdminApi(apiKey, "/admin/posts", {
      method: "POST",
      body: { data: { title: "   ", contentJson: paragraph("No title") } },
    });

    expect(response.status).toBe(400);
  });

  it("rejects a publish attempt smuggled into PATCH instead of silently dropping it", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = (await (
      await callAdminApi(apiKey, "/admin/posts", {
        method: "POST",
        body: {
          data: {
            title: `${MARK} strict patch`,
            contentJson: paragraph("body"),
          },
        },
      })
    ).json()) as { id: number };

    const response = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { title: "renamed", status: "published" } },
    });

    // Before the schema was strict this returned 200 and left a draft behind.
    expect(response.status).toBe(400);
    const post = (await (
      await callAdminApi(apiKey, `/admin/posts/${id}`)
    ).json()) as { title: string; status: string };
    expect(post.status).toBe("draft");
    // The whole PATCH is refused, so the valid field is not applied either.
    expect(post.title).toBe(`${MARK} strict patch`);
  });

  it("refuses to let a client set id, createdAt or updatedAt", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = (await (
      await callAdminApi(apiKey, "/admin/posts", {
        method: "POST",
        body: { data: { title: `${MARK} server owned`, contentJson: null } },
      })
    ).json()) as { id: number };
    const before = (await (
      await callAdminApi(apiKey, `/admin/posts/${id}`)
    ).json()) as { createdAt: string; updatedAt: string };

    // updatedAt is the default list sort key, so a forged value used to bury
    // the post; createdAt drives the date shown to readers.
    for (const forged of [
      { createdAt: "2000-01-01T00:00:00.000Z" },
      { updatedAt: "2000-01-01T00:00:00.000Z" },
      { id: 999999 },
    ]) {
      const response = await callAdminApi(apiKey, `/admin/posts/${id}`, {
        method: "PATCH",
        body: { data: { title: "Patched", ...forged } },
      });
      expect(response.status).toBe(400);
    }

    const after = (await (
      await callAdminApi(apiKey, `/admin/posts/${id}`)
    ).json()) as { title: string; createdAt: string; updatedAt: string };
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(after.title).toBe(`${MARK} server owned`);
  });

  it("still accepts the fields the admin editor sends", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = (await (
      await callAdminApi(apiKey, "/admin/posts", {
        method: "POST",
        body: { data: { title: `${MARK} editor patch`, contentJson: null } },
      })
    ).json()) as { id: number };

    const response = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: {
        data: {
          title: "Edited",
          summary: "s",
          slug: "edited-by-editor",
          contentJson: paragraph("new body"),
          publishedAt: null,
          coverMediaId: null,
          categoryId: null,
        },
      },
    });

    expect(response.status).toBe(200);
  });

  it("requires an Admin API Key", async () => {
    const request = new Request("http://localhost:3000/api/admin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { title: "Nope" } }),
    });
    const { response } = await openAPIHandler.handle(request, {
      prefix: "/api",
      context: createApiContext(request.headers, env, createMockExecutionCtx()),
    });
    if (!response) throw new Error("No route matched POST /admin/posts");
    expect(response.status).toBe(401);
  });

  it("gives every post of a same-titled batch its own slug", async () => {
    const context = createAdminTestContext();

    // generateSlug reads before it writes, so a batch racing on one title
    // derives one slug and all but the winner hit the unique index.
    const created = await Promise.all(
      Array.from({ length: 8 }, () =>
        PostService.createDraft(context, {
          title: "Same Title",
          contentJson: null,
        }).then(unwrap),
      ),
    );

    const slugs = await Promise.all(
      created.map(async ({ id }) => {
        const post = await PostService.findPostById(context, { id });
        return post?.slug ?? "";
      }),
    );
    expect(new Set(slugs).size).toBe(created.length);
    expect(slugs.every((slug) => slug.startsWith("same-title"))).toBe(true);
  });

  it("keeps readable suffixes when the same title is created one at a time", async () => {
    const context = createAdminTestContext();
    const slugs: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const { id } = unwrap(
        await PostService.createDraft(context, {
          title: "Seq Title",
          contentJson: null,
        }),
      );
      const post = await PostService.findPostById(context, { id });
      slugs.push(post?.slug ?? "");
    }
    expect(slugs).toEqual(["seq-title", "seq-title-1", "seq-title-2"]);
  });
});

describe("Admin posts list for external editors", () => {
  it("pages through every post with its body ordered by an immutable id", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const ids: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      ids.push(await createPostWithBody(context, index));
    }

    const first = await listPosts(
      apiKey,
      "includeContent=true&sortBy=id&sortDir=ASC&limit=2&offset=0",
    );
    expect(first.items.map((item) => item.id)).toEqual([ids[0], ids[1]]);
    expect(first.items[0].contentJson).toEqual(paragraph("Body 0"));
    expect(first.total).toBe(3);

    // Writing during a scan is exactly what makes the default updatedAt order
    // skip or repeat rows; the id order has to survive it.
    unwrap(
      await PostService.updatePost(context, {
        id: ids[0],
        data: { title: "Post 0 edited" },
      }),
    );

    const second = await listPosts(
      apiKey,
      "includeContent=true&sortBy=id&sortDir=ASC&limit=2&offset=2",
    );
    expect(second.items.map((item) => item.id)).toEqual([ids[2]]);
    const scanned = [...first.items, ...second.items].map((item) => item.id);
    expect(scanned).toHaveLength(ids.length);
    expect(new Set(scanned).size).toBe(ids.length);
  });

  it("keeps offset pagination stable under the default sort when rows share updatedAt", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    // updatedAt only has second precision, so rows written close together share
    // it. Without the id tiebreaker SQLite may order them any way it likes and
    // offset pages start repeating or skipping rows.
    const sharedUpdatedAt = new Date("2026-01-01T00:00:00.000Z");
    const inserted = await context.db
      .insert(PostsTable)
      .values(
        Array.from({ length: 3 }, (_, index) => ({
          title: `Tie ${index}`,
          slug: `tie-${index}`,
          updatedAt: sharedUpdatedAt,
        })),
      )
      .returning({ id: PostsTable.id });
    // The default sort is updatedAt DESC, so the tiebreaker orders ids DESC too.
    const expectedOrder = inserted.map((row) => row.id).sort((a, b) => b - a);

    const first = await listPosts(apiKey, "limit=2&offset=0");
    const second = await listPosts(apiKey, "limit=2&offset=2");
    const paged = [...first.items, ...second.items].map((item) => item.id);

    expect(paged).toEqual(expectedOrder);
    expect(new Set(paged).size).toBe(expectedOrder.length);
  });

  it("sorts by createdAt with the id as tiebreaker", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    // The oldest post gets the highest id, so a createdAt order differs from id.
    const created = [
      new Date("2026-03-01T00:00:00.000Z"),
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-02-01T00:00:00.000Z"),
      new Date("2026-02-01T00:00:00.000Z"),
    ];
    const inserted = await context.db
      .insert(PostsTable)
      .values(
        created.map((createdAt, index) => ({
          title: `Created ${index}`,
          slug: `created-${index}`,
          createdAt,
        })),
      )
      .returning({ id: PostsTable.id });
    const [march, january, februaryA, februaryB] = inserted.map(
      (row) => row.id,
    );

    const ascending = await listPosts(apiKey, "sortBy=createdAt&sortDir=ASC");
    expect(ascending.items.map((item) => item.id)).toEqual([
      january,
      februaryA,
      februaryB,
      march,
    ]);

    const descending = await listPosts(apiKey, "sortBy=createdAt&sortDir=DESC");
    expect(descending.items.map((item) => item.id)).toEqual([
      march,
      februaryB,
      februaryA,
      january,
    ]);
  });

  it("omits the body unless includeContent is requested", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    await createPostWithBody(context, 0);
    await createPostWithBody(context, 1);

    const page = await listPosts(apiKey, "sortBy=id&sortDir=ASC");

    expect(page.items).toHaveLength(2);
    expect(page.items.some((item) => "contentJson" in item)).toBe(false);
  });

  it("omits the draft body in the public taxonomy scope", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const id = await createPostWithBody(context, 0);
    unwrap(await PostService.publishPost(context, { id }));
    // The published row now carries a snapshot, so edit the draft away from it.
    unwrap(
      await PostService.updatePost(context, {
        id,
        data: { contentJson: paragraph("Draft only, never published") },
      }),
    );

    const category = await listPosts(
      apiKey,
      "includeContent=true&taxonomy[kind]=uncategorized&taxonomy[scope]=public",
    );

    // Every other column in this scope is read from the Public Content
    // Snapshot, so the unpublished draft body must not ride along.
    expect(category.items).toHaveLength(1);
    expect(category.items.some((item) => "contentJson" in item)).toBe(false);
  });

  it("returns the live page's slug, not the draft's, until the post is unpublished", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const id = await createPostWithBody(context, 0);
    const readBoth = async () => {
      const page = await listPosts(apiKey, "sortBy=id&sortDir=ASC");
      const response = await callAdminApi(apiKey, `/admin/posts/${id}`);
      expect(response.status).toBe(200);
      const post = (await response.json()) as {
        slug: string;
        publicSlug: string | null;
      };
      return { listed: page.items[0], post };
    };

    let { listed, post } = await readBoth();
    expect(listed).toMatchObject({ slug: "post-0", publicSlug: null });
    expect(post).toMatchObject({ slug: "post-0", publicSlug: null });

    unwrap(await PostService.publishPost(context, { id }));
    unwrap(
      await PostService.updatePost(context, {
        id,
        data: { slug: "renamed-draft" },
      }),
    );
    ({ listed, post } = await readBoth());
    expect(listed).toMatchObject({
      slug: "renamed-draft",
      publicSlug: "post-0",
    });
    expect(post).toMatchObject({ slug: "renamed-draft", publicSlug: "post-0" });

    unwrap(await PostService.unpublishPost(context, { id }));
    ({ listed, post } = await readBoth());
    expect(listed.publicSlug).toBeNull();
    expect(post.publicSlug).toBeNull();
  });

  it("keeps the existing page size limit", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const bulk = Array.from({ length: 55 }, (_, index) => ({
      title: `Bulk ${index}`,
      slug: `bulk-${index}`,
    }));
    // D1 rejects statements with too many bound parameters, so insert in batches.
    for (let index = 0; index < bulk.length; index += 20) {
      await context.db.insert(PostsTable).values(bulk.slice(index, index + 20));
    }

    // Above the limit is refused rather than cut to it.
    const tooMany = await callAdminApi(
      apiKey,
      "/admin/posts?includeContent=true&limit=100",
    );
    expect(tooMany.status).toBe(400);

    const page = await listPosts(apiKey, "includeContent=true&limit=50");

    expect(page.items).toHaveLength(50);
    expect(page.total).toBe(55);
    expect(page.statusCounts).toMatchObject({ draft: 55, published: 0 });
  });

  it("supports id sorting in both directions", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const ids: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      ids.push(await createPostWithBody(context, index));
    }

    const ascending = await listPosts(
      apiKey,
      "includeContent=true&sortBy=id&sortDir=ASC",
    );
    const descending = await listPosts(
      apiKey,
      "includeContent=true&sortBy=id&sortDir=DESC",
    );

    expect(ascending.items.map((item) => item.id)).toEqual(ids);
    expect(descending.items.map((item) => item.id)).toEqual([...ids].reverse());
  });

  it("filters by category, uncategorized and tag from the query string", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const [category] = await context.db
      .insert(CategoriesTable)
      .values({ name: "Notes" })
      .returning();
    const [tag] = await context.db
      .insert(TagsTable)
      .values({ name: "Rust" })
      .returning();
    const [inCategory, tagged] = await context.db
      .insert(PostsTable)
      .values([
        { title: "In category", slug: "in-category", categoryId: category.id },
        { title: "Tagged", slug: "tagged" },
      ])
      .returning();
    await context.db
      .insert(PostTagsTable)
      .values({ postId: tagged.id, tagId: tag.id });

    const byCategory = await listPosts(apiKey, `categoryId=${category.id}`);
    const byTag = await listPosts(apiKey, `tagId=${tag.id}`);
    const uncategorized = await listPosts(apiKey, "uncategorized=true");
    const both = await listPosts(
      apiKey,
      `categoryId=${category.id}&tagId=${tag.id}`,
    );

    expect(byCategory.items.map((item) => item.id)).toEqual([inCategory.id]);
    expect(byTag.items.map((item) => item.id)).toEqual([tagged.id]);
    expect(uncategorized.items.map((item) => item.id)).toEqual([tagged.id]);
    expect(both.total).toBe(0);
    expect(both.statusCounts).toMatchObject({ draft: 0, published: 0 });
  });

  it("lists each post's draft category and tags, tags by name", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const [category] = await context.db
      .insert(CategoriesTable)
      .values({ name: "Notes" })
      .returning();
    const [rust, go, zig] = await context.db
      .insert(TagsTable)
      .values([{ name: "Rust" }, { name: "Go" }, { name: "Zig" }])
      .returning();
    const [both, bare, tagOnly] = await context.db
      .insert(PostsTable)
      .values([
        { title: "Both", slug: "both", categoryId: category.id },
        { title: "Bare", slug: "bare" },
        { title: "Tag only", slug: "tag-only" },
      ])
      .returning();
    await context.db.insert(PostTagsTable).values([
      { postId: both.id, tagId: rust.id },
      { postId: both.id, tagId: go.id },
      { postId: tagOnly.id, tagId: zig.id },
    ]);

    const page = await listPosts(apiKey, "sortBy=id&sortDir=ASC");

    expect(
      page.items.map(({ id, category, tags }) => ({ id, category, tags })),
    ).toEqual([
      {
        id: both.id,
        category: { id: category.id, name: "Notes" },
        tags: [
          { id: go.id, name: "Go" },
          { id: rust.id, name: "Rust" },
        ],
      },
      { id: bare.id, category: null, tags: [] },
      {
        id: tagOnly.id,
        category: null,
        tags: [{ id: zig.id, name: "Zig" }],
      },
    ]);
  });

  it("lists the published assignments in the public taxonomy scope", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const [live, draft] = await context.db
      .insert(CategoriesTable)
      .values([{ name: "Live" }, { name: "Draft" }])
      .returning();
    const [liveTag, draftTag] = await context.db
      .insert(TagsTable)
      .values([{ name: "live-tag" }, { name: "draft-tag" }])
      .returning();
    const id = await createPostWithBody(context, 0);
    const assign = async (categoryId: number, tagId: number) => {
      unwrap(
        await PostService.updatePost(context, { id, data: { categoryId } }),
      );
      unwrap(
        await TagService.setPostTags(context, { postId: id, tagIds: [tagId] }),
      );
    };
    await assign(live.id, liveTag.id);
    unwrap(await PostService.publishPost(context, { id }));
    await assign(draft.id, draftTag.id);

    const current = await listPosts(
      apiKey,
      `taxonomy[kind]=category&taxonomy[id]=${draft.id}&taxonomy[scope]=current`,
    );
    const published = await listPosts(
      apiKey,
      `taxonomy[kind]=category&taxonomy[id]=${live.id}&taxonomy[scope]=public`,
    );

    expect(current.items.map((item) => item.id)).toEqual([id]);
    expect(current.items[0]).toMatchObject({
      category: { id: draft.id, name: "Draft" },
      tags: [{ id: draftTag.id, name: "draft-tag" }],
    });
    expect(published.items.map((item) => item.id)).toEqual([id]);
    expect(published.items[0]).toMatchObject({
      category: { id: live.id, name: "Live" },
      tags: [{ id: liveTag.id, name: "live-tag" }],
    });
  });
});
