import { env } from "cloudflare:workers";
import {
  createMockAdminSession,
  createMockExecutionCtx,
  seedUser,
} from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { getAuth } from "@/lib/auth/auth.server";
import { getDb } from "@/lib/db";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

/**
 * Exercises the Admin HTTP API the way an external editor (script, agent,
 * desktop client) calls it: Admin API Key in \`x-api-key\` and no browser session.
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

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("Admin posts API for external editors", () => {
  it("creates a new draft when the request carries content", async () => {
    const apiKey = await createAdminApiKey();

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
      status: string;
      contentJson: unknown;
    };
    expect(post.title).toBe("Written in Obsidian");
    expect(post.slug).toBe("written-in-obsidian");
    expect(post.status).toBe("draft");
    expect(post.contentJson).toEqual(
      paragraph("Hello from an external editor"),
    );

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
    const apiKey = await createAdminApiKey();

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
    const apiKey = await createAdminApiKey();

    const response = await callAdminApi(apiKey, "/admin/posts", {
      method: "POST",
      body: { data: { title: "   ", contentJson: paragraph("No title") } },
    });

    expect(response.status).toBe(400);
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
});
