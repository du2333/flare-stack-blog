import { env } from "cloudflare:workers";
import {
  createMockExecutionCtx,
  seedAdminApiKey,
  seedUser,
} from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import {
  CommentsTable,
  FriendLinksTable,
  MediaTable,
  MomentsTable,
} from "@/lib/db/schema";
import { createApiContext } from "@/lib/orpc/create-context";
import { handleApiRequest, openAPIHandler } from "@/lib/orpc/openapi-handler";

/**
 * A path parameter comes from the path only. oRPC merges a request's body
 * (its query, for GET) over the path parameters, so `DELETE /admin/posts/97`
 * with `{"id":98}` used to delete post 98. Every operation of the document
 * that has path parameters is called here addressing one object by its path
 * and another by a body field or query parameter of the same name: each must
 * answer 400 naming that field and leave the database as it was.
 */

type Parameter = { name: string; in: string };
type Operation = { parameters?: Array<Parameter> };

const { response: specResponse } = await openAPIHandler.handle(
  new Request("http://localhost/api/spec.json"),
  { prefix: "/api", context: {} as never },
);
if (!specResponse) throw new Error("No route served /api/spec.json");
const doc = (await specResponse.json()) as {
  paths: Record<string, Record<string, Operation>>;
};

const operations = Object.entries(doc.paths).flatMap(([path, methods]) =>
  Object.entries(methods).flatMap(([method, operation]) => {
    const names = (operation.parameters ?? [])
      .filter((parameter) => parameter.in === "path")
      .map((parameter) => parameter.name);
    return names.length > 0
      ? [[method.toUpperCase(), path, names] as const]
      : [];
  }),
);

async function call(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  const headers = new Headers({ "x-api-key": apiKey });
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  const request = new Request(`http://localhost:3000/api${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return handleApiRequest(
    request,
    createApiContext(request.headers, env, createMockExecutionCtx()),
  );
}

async function created<T>(response: Response) {
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}

type Pair = [unknown, unknown];

/** Two of every kind of object a path names: the first is addressed by the path. */
async function seedPairs(apiKey: string) {
  const db = getDb(env);
  const posts: Array<{ id: number; slug: string; revisionId: number }> = [];
  for (const title of ["Addressed", "Smuggled"]) {
    const { id } = await created<{ id: number }>(
      await call(apiKey, "/admin/posts", {
        method: "POST",
        body: { data: { title } },
      }),
    );
    await created(
      await call(apiKey, `/admin/posts/${id}/publish`, {
        method: "POST",
        body: {},
      }),
    );
    const { slug } = await created<{ slug: string }>(
      await call(apiKey, `/admin/posts/${id}`),
    );
    const [revision] = await created<Array<{ id: number }>>(
      await call(apiKey, `/admin/posts/${id}/revisions`),
    );
    posts.push({ id, slug, revisionId: revision.id });
  }
  const tags: Array<number> = [];
  const categories: Array<number> = [];
  for (const name of ["Addressed", "Smuggled"]) {
    tags.push(
      (
        await created<{ id: number }>(
          await call(apiKey, "/admin/tags", { method: "POST", body: { name } }),
        )
      ).id,
    );
    categories.push(
      (
        await created<{ id: number }>(
          await call(apiKey, "/admin/categories", {
            method: "POST",
            body: { name },
          }),
        )
      ).id,
    );
  }
  const userIds = ["path-user-a", "path-user-b"];
  for (const id of userIds) {
    await seedUser(db, { id, name: id, email: `${id}@example.com` });
  }
  const comments = await db
    .insert(CommentsTable)
    .values(
      posts.map((post, index) => ({
        postId: post.id,
        userId: userIds[index],
        content: JSON.stringify({ type: "doc", content: [] }),
      })),
    )
    .returning({ id: CommentsTable.id });
  const friendLinks = await db
    .insert(FriendLinksTable)
    .values(
      ["a", "b"].map((name) => ({
        siteName: `Site ${name}`,
        siteUrl: `https://${name}.example.com`,
      })),
    )
    .returning({ id: FriendLinksTable.id });
  const moments = await db
    .insert(MomentsTable)
    .values(["a", "b"].map((text) => ({ text })))
    .returning({ id: MomentsTable.id });
  const mediaKeys = ["path-a.png", "path-b.png"];
  await db.insert(MediaTable).values(
    mediaKeys.map((key) => ({
      key,
      url: `/images/${key}`,
      fileName: key,
      mimeType: "image/png",
      sizeInBytes: 1,
    })),
  );

  const pairs: Record<string, Pair> = {
    posts: [posts[0].id, posts[1].id],
    revisions: [posts[0].revisionId, posts[1].revisionId],
    tags: [tags[0], tags[1]],
    categories: [categories[0], categories[1]],
    comments: [comments[0].id, comments[1].id],
    "friend-links": [friendLinks[0].id, friendLinks[1].id],
    media: [mediaKeys[0], mediaKeys[1]],
    moments: [moments[0].id, moments[1].id],
    "muted-users": [userIds[0], userIds[1]],
    slugs: [posts[0].slug, posts[1].slug],
  };
  // The kind of object a `{param}` names is the path segment before it.
  return (path: string, name: string): Pair => {
    const segments = path.split("/");
    const kind =
      name === "slug" ? "slugs" : segments[segments.indexOf(`{${name}}`) - 1];
    const pair = pairs[kind];
    if (!pair) throw new Error(`No objects to name {${name}} in ${path}`);
    return pair;
  };
}

// Auth bookkeeping (an API Key's last use) may change on any request.
const UNWATCHED_TABLES = new Set(["apikey", "session", "verification"]);

/** Every row of every table, to tell whether a request wrote anything. */
async function snapshot() {
  const { results } = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name",
  ).all<{ name: string }>();
  const tables = results
    .map(({ name }) => name)
    .filter((name) => !UNWATCHED_TABLES.has(name));
  const rows = await Promise.all(
    tables.map(
      async (name) =>
        [
          name,
          (await env.DB.prepare(`SELECT * FROM "${name}"`).all()).results,
        ] as const,
    ),
  );
  return Object.fromEntries(rows);
}

describe("path parameters", () => {
  it("finds every operation with path parameters", () => {
    expect(operations.length).toBeGreaterThan(30);
  });

  it.each(operations)(
    "%s %s refuses a body or query field named like a path parameter",
    async (method, path, names) => {
      const apiKey = await seedAdminApiKey();
      const pairOf = await seedPairs(apiKey);
      const address = path.replace(/\{([^}]+)\}/g, (_, name: string) =>
        encodeURIComponent(String(pairOf(path, name)[0])),
      );
      const before = await snapshot();

      for (const name of names) {
        const other = pairOf(path, name)[1];
        const query = `${address}?${new URLSearchParams({ [name]: String(other) })}`;
        const attempts = [
          { where: "query", path: query, init: { method } },
          ...(method === "GET"
            ? []
            : [
                {
                  where: "body",
                  path: address,
                  init: { method, body: { [name]: other } },
                },
              ]),
        ];
        for (const attempt of attempts) {
          const response = await call(apiKey, attempt.path, attempt.init);

          const label = `${name} in the ${attempt.where}`;
          expect(response.status, label).toBe(400);
          const body = (await response.json()) as {
            code: string;
            data: { issues: Array<{ path: Array<string> }> };
          };
          expect(body.code, label).toBe("BAD_REQUEST");
          expect(
            body.data.issues.map((issue) => issue.path),
            label,
          ).toContainEqual([name]);
        }
      }

      expect(await snapshot()).toEqual(before);
    },
  );
});
