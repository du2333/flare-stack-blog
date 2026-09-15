import { env } from "cloudflare:workers";
import {
  createAdminTestContext,
  createMockExecutionCtx,
  createMockAdminSession,
  seedUser,
} from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { getAuth } from "@/lib/auth/auth.server";
import { getDb } from "@/lib/db";
import { PostsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";
import * as PostService from "@/features/posts/services/posts.service";

/**
 * Exercises the Admin list endpoint the way an external editor (script, agent,
 * desktop client) reads a whole blog: bodies included, ordered by id, paged
 * with offset while the same client may also be writing.
 */
async function createAdminApiKey() {
  const db = getDb(env);
  const admin = createMockAdminSession().user;
  await seedUser(db, admin);
  const auth = getAuth({ db, env });
  const created = await auth.api.createApiKey({
    body: { name: "external-editor", userId: admin.id },
  });
  return created.key;
}

async function listPosts(apiKey: string, query: string) {
  const request = new Request(
    `http://localhost:3000/api/admin/posts?${query}`,
    {
      headers: { "x-api-key": apiKey },
    },
  );
  const { response } = await openAPIHandler.handle(request, {
    prefix: "/api",
    context: createApiContext(request.headers, env, createMockExecutionCtx()),
  });
  if (!response) throw new Error("No route matched GET /admin/posts");
  expect(response.status).toBe(200);
  return (await response.json()) as {
    items: Array<{ id: number; title: string; contentJson?: unknown }>;
    total: number;
    statusCounts: { draft: number; published: number };
  };
}

type AdminContext = ReturnType<typeof createAdminTestContext>;

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

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("Admin posts list for external editors", () => {
  it("pages through every post with its body ordered by an immutable id", async () => {
    const apiKey = await createAdminApiKey();
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
    expect(
      [...first.items, ...second.items].map((item) => item.id),
    ).toHaveLength(new Set(ids).size);
  });

  it("omits the body unless includeContent is requested", async () => {
    const apiKey = await createAdminApiKey();
    const context = createAdminTestContext();
    await createPostWithBody(context, 0);
    await createPostWithBody(context, 1);

    const page = await listPosts(apiKey, "sortBy=id&sortDir=ASC");

    expect(page.items).toHaveLength(2);
    expect(page.items.some((item) => "contentJson" in item)).toBe(false);
  });

  it("keeps the existing page size limit", async () => {
    const apiKey = await createAdminApiKey();
    const context = createAdminTestContext();
    const bulk = Array.from({ length: 55 }, (_, index) => ({
      title: `Bulk ${index}`,
      slug: `bulk-${index}`,
    }));
    // D1 rejects statements with too many bound parameters, so insert in batches.
    for (let index = 0; index < bulk.length; index += 20) {
      await context.db.insert(PostsTable).values(bulk.slice(index, index + 20));
    }

    const page = await listPosts(apiKey, "includeContent=true&limit=100");

    expect(page.items).toHaveLength(50);
    expect(page.total).toBe(55);
    expect(page.statusCounts).toEqual({ draft: 55, published: 0 });
  });

  it("supports id sorting in both directions", async () => {
    const apiKey = await createAdminApiKey();
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
});
