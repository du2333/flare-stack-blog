import { env } from "cloudflare:workers";
import { createMockExecutionCtx, seedAdminApiKey } from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

/**
 * What the Admin HTTP API refuses before it writes anything: fields it does
 * not know, pagination that is not a whole number in range, and post, Category
 * and Tag fields outside their rules.
 */

type AdminPost = {
  id: number;
  title: string;
  slug: string;
  saveToken: string;
};

async function callApi(
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

async function createPost(apiKey: string, title: string) {
  const response = await callApi(apiKey, "/admin/posts", {
    method: "POST",
    body: { data: { title } },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { id: number; saveToken: string };
}

async function readPost(apiKey: string, id: number) {
  const response = await callApi(apiKey, `/admin/posts/${id}`);
  expect(response.status).toBe(200);
  return (await response.json()) as AdminPost;
}

function patchPost(apiKey: string, id: number, body: Record<string, unknown>) {
  return callApi(apiKey, `/admin/posts/${id}`, { method: "PATCH", body });
}

describe("unknown fields", () => {
  it("refuses a misspelt saveToken instead of saving unconditionally", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, "Guarded");

    const response = await patchPost(apiKey, id, {
      data: { title: "Overwritten" },
      save_token: saveToken,
    });

    expect(response.status).toBe(400);
    const after = await readPost(apiKey, id);
    expect(after.title).toBe("Guarded");
    expect(after.saveToken).toBe(saveToken);
  });

  it("refuses an unknown field on a body that has none of its own", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, "Draft");

    const response = await callApi(apiKey, `/admin/posts/${id}/unpublish`, {
      method: "POST",
      body: { saveToken },
    });

    expect(response.status).toBe(400);
  });

  it("refuses an unknown query parameter", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/admin/posts?stauts=draft");

    expect(response.status).toBe(400);
  });
});

async function codeOf(response: Response) {
  return ((await response.json()) as { code: string }).code;
}

function publish(apiKey: string, id: number) {
  return callApi(apiKey, `/admin/posts/${id}/publish`, {
    method: "POST",
    body: {},
  });
}

describe("pagination", () => {
  it.each([
    ["/admin/posts?limit=2.5"],
    ["/admin/posts?limit=-5"],
    ["/admin/posts?limit=0"],
    ["/admin/posts?limit=51"],
    ["/admin/posts?offset=-1"],
    ["/admin/posts?offset=1.5"],
    ["/admin/media?limit=2.5"],
    ["/admin/media?cursor=-1"],
    ["/admin/friend-links?offset=-1"],
    ["/posts?limit=2.5"],
    ["/posts?cursor=-1"],
    ["/posts/1/comments?limit=101"],
    ["/moments/1/comments?limit=101"],
  ])("refuses %s with 400", async (path) => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, path);

    expect(response.status).toBe(400);
  });

  it("takes whole numbers within range", async () => {
    const apiKey = await seedAdminApiKey();
    await createPost(apiKey, "One");
    await createPost(apiKey, "Two");

    const response = await callApi(apiKey, "/admin/posts?limit=1&offset=1");

    expect(response.status).toBe(200);
    const page = (await response.json()) as { items: Array<unknown> };
    expect(page.items).toHaveLength(1);
  });
});

describe("post title and slug", () => {
  it("trims the title and refuses an empty or overlong one", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "  Spaced  ");
    expect((await readPost(apiKey, id)).title).toBe("Spaced");

    for (const title of ["", "   ", "x".repeat(201)]) {
      const response = await patchPost(apiKey, id, { data: { title } });
      expect(response.status).toBe(400);
    }
    const create = await callApi(apiKey, "/admin/posts", {
      method: "POST",
      body: { data: { title: "x".repeat(201) } },
    });
    expect(create.status).toBe(400);
    expect((await readPost(apiKey, id)).title).toBe("Spaced");
  });

  it.each([
    [""],
    ["   "],
    ["a/../x?y#z"],
    ["with space"],
    ["percent%20"],
    ["back\\slash"],
    ["tab\there"],
    [".."],
    ["x".repeat(201)],
  ])("refuses the slug %j", async (slug) => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Slug rules");
    const before = await readPost(apiKey, id);

    const response = await patchPost(apiKey, id, { data: { slug } });

    expect(response.status).toBe(400);
    expect((await readPost(apiKey, id)).slug).toBe(before.slug);
  });

  it("takes a trimmed slug in any script", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Unicode");

    const response = await patchPost(apiKey, id, {
      data: { slug: "  你好-world.v2  " },
    });

    expect(response.status).toBe(200);
    expect((await readPost(apiKey, id)).slug).toBe("你好-world.v2");
  });

  it("answers 409 SLUG_TAKEN for another post's slug in any case", async () => {
    const apiKey = await seedAdminApiKey();
    const first = await createPost(apiKey, "First");
    await patchPost(apiKey, first.id, { data: { slug: "taken-slug" } });
    const second = await createPost(apiKey, "Second");
    const before = await readPost(apiKey, second.id);

    for (const slug of ["taken-slug", "Taken-SLUG"]) {
      const response = await patchPost(apiKey, second.id, { data: { slug } });
      expect(response.status).toBe(409);
      expect(await codeOf(response)).toBe("SLUG_TAKEN");
    }
    const after = await readPost(apiKey, second.id);
    expect(after.slug).toBe(before.slug);
    expect(after.saveToken).toBe(before.saveToken);
  });

  it("answers 409 SLUG_TAKEN for the slug of another post's live page", async () => {
    const apiKey = await seedAdminApiKey();
    const live = await createPost(apiKey, "Live");
    await patchPost(apiKey, live.id, { data: { slug: "live-page" } });
    expect((await publish(apiKey, live.id)).status).toBe(200);
    // The draft moves on; the live page keeps the old slug until republished.
    await patchPost(apiKey, live.id, { data: { slug: "live-page-next" } });
    const other = await createPost(apiKey, "Other");

    const response = await patchPost(apiKey, other.id, {
      data: { slug: "LIVE-page" },
    });

    expect(response.status).toBe(409);
    expect(await codeOf(response)).toBe("SLUG_TAKEN");
  });

  it("lets a post keep its own slug and change its case", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Own");
    await patchPost(apiKey, id, { data: { slug: "own-slug" } });

    const same = await patchPost(apiKey, id, { data: { slug: "own-slug" } });
    expect(same.status).toBe(200);
    const recased = await patchPost(apiKey, id, { data: { slug: "Own-Slug" } });
    expect(recased.status).toBe(200);
  });

  it("refuses to publish a slug another live page has in another case", async () => {
    const apiKey = await seedAdminApiKey();
    const first = await createPost(apiKey, "First live");
    await patchPost(apiKey, first.id, { data: { slug: "shared" } });
    expect((await publish(apiKey, first.id)).status).toBe(200);
    await patchPost(apiKey, first.id, { data: { slug: "moved-on" } });
    const second = await createPost(apiKey, "Second live");
    // Written past the API's checks, as an older row may have been.
    await env.DB.prepare(
      "UPDATE posts SET slug = 'SHARED', slug_key = NULL WHERE id = ?",
    )
      .bind(second.id)
      .run();

    const response = await publish(apiKey, second.id);

    expect(response.status).toBe(409);
    expect(await codeOf(response)).toBe("PUBLIC_SLUG_TAKEN");
  });

  it("keeps saving and republishing a post whose old slug clashes in case", async () => {
    const apiKey = await seedAdminApiKey();
    const first = await createPost(apiKey, "Old one");
    await patchPost(apiKey, first.id, { data: { slug: "old-clash" } });
    expect((await publish(apiKey, first.id)).status).toBe(200);
    const second = await createPost(apiKey, "Old two");
    // Two pages that differ only in case, from before the check existed.
    await env.DB.prepare(
      "UPDATE posts SET slug = 'OLD-CLASH', slug_key = NULL, public_slug = 'OLD-CLASH', public_slug_key = NULL WHERE id = ?",
    )
      .bind(second.id)
      .run();

    const saved = await patchPost(apiKey, second.id, {
      data: { slug: "OLD-CLASH", title: "Old two, edited" },
    });
    expect(saved.status).toBe(200);
    expect((await publish(apiKey, second.id)).status).toBe(200);
  });

  it("generates a slug no other post uses in any case", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Mixed");
    await env.DB.prepare(
      "UPDATE posts SET slug = 'Hello-World', slug_key = NULL WHERE id = ?",
    )
      .bind(id)
      .run();

    const response = await callApi(
      apiKey,
      "/admin/posts/slug?title=hello%20world",
    );

    expect(((await response.json()) as { slug: string }).slug).toBe(
      "hello-world-1",
    );
  });

  it("cuts a slug generated from a long title to fit", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "a".repeat(200));

    const { slug } = await readPost(apiKey, id);

    expect(slug.length).toBeLessThanOrEqual(200);
    expect((await patchPost(apiKey, id, { data: { slug } })).status).toBe(200);
  });
});

describe("publication date", () => {
  it("refuses to publish a time later today", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Later today");
    const later = new Date(Date.now() + 60_000);
    await patchPost(apiKey, id, { data: { publishedAt: later.toISOString() } });

    const response = await publish(apiKey, id);

    expect(response.status).toBe(400);
    expect(await codeOf(response)).toBe("PUBLISHED_AT_IN_FUTURE");
  });

  it("answers the same whole-second date on admin and public reads", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Precision");
    await patchPost(apiKey, id, { data: { slug: "precision" } });
    expect((await publish(apiKey, id)).status).toBe(200);

    const admin = (await (
      await callApi(apiKey, `/admin/posts/${id}`)
    ).json()) as { publishedAt: string };
    const publicPost = (await (
      await callApi(apiKey, "/posts/precision")
    ).json()) as { publishedAt: string };

    expect(publicPost.publishedAt).toBe(admin.publishedAt);
    expect(new Date(admin.publishedAt).getMilliseconds()).toBe(0);
  });
});

describe("category and tag names", () => {
  it.each([
    ["/admin/tags", "TAG_NAME_ALREADY_EXISTS"],
    ["/admin/categories", "CATEGORY_NAME_ALREADY_EXISTS"],
  ])(
    "%s trims names and refuses one differing only in case",
    async (path, code) => {
      const apiKey = await seedAdminApiKey();
      const created = await callApi(apiKey, path, {
        method: "POST",
        body: { name: "  AUDIT tag1  " },
      });
      expect(created.status).toBe(200);
      const { id, name } = (await created.json()) as {
        id: number;
        name: string;
      };
      expect(name).toBe("AUDIT tag1");

      const duplicate = await callApi(apiKey, path, {
        method: "POST",
        body: { name: "audit TAG1" },
      });
      expect(duplicate.status).toBe(409);
      expect(await codeOf(duplicate)).toBe(code);

      for (const blank of ["", "   "]) {
        const response = await callApi(apiKey, path, {
          method: "POST",
          body: { name: blank },
        });
        expect(response.status).toBe(400);
      }

      const other = (await (
        await callApi(apiKey, path, { method: "POST", body: { name: "Other" } })
      ).json()) as { id: number };
      const rename = await callApi(apiKey, `${path}/${other.id}`, {
        method: "PATCH",
        body: { data: { name: "Audit Tag1" } },
      });
      expect(rename.status).toBe(409);
      expect(await codeOf(rename)).toBe(code);

      // Changing only the case of its own name is fine.
      const recase = await callApi(apiKey, `${path}/${id}`, {
        method: "PATCH",
        body: { data: { name: "audit tag1" } },
      });
      expect(recase.status).toBe(200);
    },
  );
});

describe("setting a post's tags", () => {
  it("answers 404 TAG_NOT_FOUND for an unknown tag id and writes nothing", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Tagged");
    const tag = (await (
      await callApi(apiKey, "/admin/tags", {
        method: "POST",
        body: { name: "Kept" },
      })
    ).json()) as { id: number };
    const set = await callApi(apiKey, `/admin/posts/${id}/tags`, {
      method: "PUT",
      body: { tagIds: [tag.id] },
    });
    const { saveToken } = (await set.json()) as { saveToken: string };

    const response = await callApi(apiKey, `/admin/posts/${id}/tags`, {
      method: "PUT",
      body: { tagIds: [tag.id, 999_999], saveToken },
    });

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("TAG_NOT_FOUND");
    const tags = (await (
      await callApi(apiKey, `/admin/posts/${id}/tags`)
    ).json()) as Array<{ id: number }>;
    expect(tags.map((t) => t.id)).toEqual([tag.id]);
    expect((await readPost(apiKey, id)).saveToken).toBe(saveToken);
  });

  it("answers POST_NOT_FOUND for a missing post whatever its tags", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/admin/posts/999999/tags", {
      method: "PUT",
      body: { tagIds: [999_999] },
    });

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("POST_NOT_FOUND");
  });

  it("still answers an Edit Conflict for a stale token with known tags", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, "Stale tags");
    await patchPost(apiKey, id, { data: { title: "Saved since" } });

    const response = await callApi(apiKey, `/admin/posts/${id}/tags`, {
      method: "PUT",
      body: { tagIds: [], saveToken },
    });

    expect(response.status).toBe(409);
    expect(await codeOf(response)).toBe("EDIT_CONFLICT");
  });

  it.each([
    ["a tag's id written as a string", (id: number) => String(id)],
    ["a fraction", () => 1.5],
    ["zero", () => 0],
    ["a negative number", () => -1],
  ])("refuses %s with 400 and writes nothing", async (_label, write) => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, "Strict tags");
    const tag = (await (
      await callApi(apiKey, "/admin/tags", {
        method: "POST",
        body: { name: "Strict" },
      })
    ).json()) as { id: number };

    const response = await callApi(apiKey, `/admin/posts/${id}/tags`, {
      method: "PUT",
      body: { tagIds: [write(tag.id)] },
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      data: { issues: Array<{ path: Array<string | number> }> };
    };
    expect(body.data.issues.map((issue) => issue.path)).toEqual([
      ["tagIds", 0],
    ]);
    expect((await readPost(apiKey, id)).saveToken).toBe(saveToken);
  });
});

describe("tagIds sent with a post's fields", () => {
  it.each([
    ["in data", (tagIds: Array<number>) => ({ data: { tagIds } })],
    [
      "next to data",
      (tagIds: Array<number>) => ({ data: { title: "Retitled" }, tagIds }),
    ],
  ])(
    "refuses them %s, naming the operation that sets Tags",
    async (_label, body) => {
      const apiKey = await seedAdminApiKey();
      const { id, saveToken } = await createPost(apiKey, "Untagged");

      const response = await patchPost(apiKey, id, body([1]));

      expect(response.status).toBe(400);
      const { data } = (await response.json()) as {
        data: { issues: Array<{ message: string }> };
      };
      expect(data.issues).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining("PUT /admin/posts/{postId}/tags"),
        }),
      );
      expect((await readPost(apiKey, id)).saveToken).toBe(saveToken);
    },
  );

  it("refuses them when creating a post too", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/admin/posts", {
      method: "POST",
      body: { data: { title: "Tagged at birth", tagIds: [1] } },
    });

    expect(response.status).toBe(400);
    const { data } = (await response.json()) as {
      data: { issues: Array<{ message: string }> };
    };
    expect(data.issues[0].message).toContain("PUT /admin/posts/{postId}/tags");
  });
});

describe("query parameters", () => {
  it("refuses a query parameter on a save instead of ignoring it", async () => {
    const apiKey = await seedAdminApiKey();
    const { id, saveToken } = await createPost(apiKey, "Queried");

    const response = await callApi(
      apiKey,
      `/admin/posts/${id}?contentFormat=markdown`,
      { method: "PATCH", body: { data: { title: "Saved" }, saveToken } },
    );

    expect(response.status).toBe(400);
    const { data } = (await response.json()) as {
      data: { issues: Array<{ path: Array<string> }> };
    };
    expect(data.issues.map((issue) => issue.path)).toEqual([["contentFormat"]]);
    const after = await readPost(apiKey, id);
    expect(after.title).toBe("Queried");
    expect(after.saveToken).toBe(saveToken);
  });

  it("takes contentFormat in the body of a save", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Formatted");

    const response = await patchPost(apiKey, id, {
      data: { contentMarkdown: "Hello" },
      contentFormat: "markdown",
    });

    expect(response.status).toBe(200);
    const post = (await response.json()) as Record<string, unknown>;
    expect(post.contentMarkdown).toContain("Hello");
    expect(post).not.toHaveProperty("contentJson");
  });

  it("refuses a query parameter on an operation with no body", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Kept");

    const response = await callApi(apiKey, `/admin/posts/${id}?force=1`, {
      method: "DELETE",
    });

    expect(response.status).toBe(400);
    expect((await callApi(apiKey, `/admin/posts/${id}`)).status).toBe(200);
  });

  it.each([
    ["an admin read", "/admin/posts?stauts=draft", "stauts"],
    ["a public read", "/posts?stauts=draft", "stauts"],
    ["a public read that takes no input", "/posts/pinned?limit=3", "limit"],
    ["an admin read that takes no input", "/admin/dashboard?x=1", "x"],
  ])("refuses an unknown query parameter on %s", async (_label, path, name) => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, path);

    expect(response.status).toBe(400);
    const { data } = (await response.json()) as {
      data: { issues: Array<{ path: Array<string> }> };
    };
    expect(data.issues.map((issue) => issue.path)).toEqual([[name]]);
  });

  it("still takes the query parameters a read declares", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/posts?limit=1");

    expect(response.status).toBe(200);
  });

  it("refuses a body on an operation that takes none", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callApi(apiKey, "/admin/search/rebuild", {
      method: "POST",
      body: { force: true },
    });

    expect(response.status).toBe(400);
  });
});
