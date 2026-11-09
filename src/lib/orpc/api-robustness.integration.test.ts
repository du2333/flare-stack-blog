import { env } from "cloudflare:workers";
import { createMockExecutionCtx, seedAdminApiKey } from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { createApiContext } from "@/lib/orpc/create-context";
import { handleApiRequest } from "@/lib/orpc/openapi-handler";

/**
 * What the HTTP API answers to requests that cannot work: no operation takes
 * them, they name an id in a form no id is written in, or they carry more
 * than an operation reads. Each gets a JSON answer that says what is wrong.
 */

async function call(
  path: string,
  init: {
    method?: string;
    body?: BodyInit;
    apiKey?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const headers = new Headers(init.headers);
  if (init.apiKey) headers.set("x-api-key", init.apiKey);
  const request = new Request(`http://localhost:3000/api${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
  });
  return handleApiRequest(
    request,
    createApiContext(request.headers, env, createMockExecutionCtx()),
  );
}

function callJson(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  return call(path, {
    method: init.method,
    apiKey,
    headers: { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function createPost(apiKey: string, title: string) {
  const response = await callJson(apiKey, "/admin/posts", {
    method: "POST",
    body: { data: { title } },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { id: number; saveToken: string };
}

describe("unknown routes and wrong methods", () => {
  it("answers an unknown path with a JSON 404 ROUTE_NOT_FOUND", async () => {
    const response = await call("/admin/nothing-here");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toMatchObject({
      code: "ROUTE_NOT_FOUND",
      status: 404,
      defined: false,
    });
  });

  it("answers the API root the same way", async () => {
    expect((await call("")).status).toBe(404);
    expect((await call("/")).status).toBe(404);
  });

  it("answers a known path with another method 405, listing the methods", async () => {
    const response = await call("/admin/posts/slug", { method: "PUT" });

    expect(response.status).toBe(405);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("allow")).toContain("GET");
    const body = (await response.json()) as {
      code: string;
      status: number;
      data: { allow: Array<string> };
    };
    expect(body.code).toBe("METHOD_NOT_ALLOWED");
    expect(body.status).toBe(405);
    expect(body.data.allow).toContain("GET");
  });

  it("lists every method a path with parameters takes", async () => {
    const response = await call("/admin/tags/5", { method: "POST" });

    expect(response.status).toBe(405);
    const allow = response.headers.get("allow")?.split(", ");
    expect(allow).toEqual(expect.arrayContaining(["PATCH", "DELETE"]));
    expect(allow).not.toContain("POST");
  });

  it("answers a path of a lazily loaded feature the same way", async () => {
    const response = await call("/admin/media/stats", { method: "PUT" });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toContain("GET");
  });

  it("keeps serving the routes that exist", async () => {
    const response = await call("/search/version");

    expect(response.status).toBe(200);
  });
});

describe("the OpenAPI document", () => {
  it("serves its index and a subset", async () => {
    const index = await call("/spec/index.json");
    expect(index.status).toBe(200);
    const { paths } = (await index.json()) as {
      paths: Record<string, Record<string, { operationId: string }>>;
    };
    expect(paths["/admin/posts/{id}"]?.get?.operationId).toBe(
      "posts.admin.get",
    );

    const subset = await call("/spec.json?operationIds=posts.admin.get");
    expect(subset.status).toBe(200);
    const document = (await subset.json()) as { paths: object };
    expect(Object.keys(document.paths)).toEqual(["/admin/posts/{id}"]);
  });

  it("answers a wrong call JSON, as other routes do", async () => {
    const posted = await call("/spec/index.json", { method: "POST" });
    expect(posted.status).toBe(405);
    expect(posted.headers.get("allow")).toBe("GET");

    const unknown = await call("/spec.json?operationIds=posts.nope");
    expect(unknown.status).toBe(404);
    expect(unknown.headers.get("content-type")).toContain("application/json");
    expect(await unknown.json()).toMatchObject({ code: "OPERATION_NOT_FOUND" });
  });
});

describe("path ids", () => {
  it.each([
    ["a decimal point", (id: number) => `${id}.0`],
    ["an exponent", (id: number) => `${id}e0`],
    ["leading zeros", (id: number) => `0${id}`],
    ["a plus sign", (id: number) => `+${id}`],
    ["an encoded space", (id: number) => `%20${id}`],
    ["a trailing space", (id: number) => `${id}%20`],
    ["a hex prefix", () => "0x1"],
    ["zero", () => "0"],
    ["a negative number", () => "-1"],
    ["too many digits", () => "9".repeat(30)],
  ])("refuses a post id written with %s", async (_label, write) => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Addressed once");

    const response = await callJson(apiKey, `/admin/posts/${write(id)}`);

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      data: { issues: Array<{ path: Array<string> }> };
    };
    expect(body.data.issues[0].path).toEqual(["id"]);
  });

  it("takes the id written as plain digits", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Addressed once");

    const response = await callJson(apiKey, `/admin/posts/${id}`);

    expect(response.status).toBe(200);
  });

  it("checks every id of a path", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Revisions");

    const response = await callJson(apiKey, `/admin/posts/${id}/revisions/1.0`);

    expect(response.status).toBe(400);
  });

  it("leaves paths whose parameter is text alone", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await callJson(apiKey, "/admin/media/74/posts");

    // The key is text: it names no Media here, which is not a malformed id.
    expect(response.status).not.toBe(400);
  });

  it("refuses an id in a public path too", async () => {
    const response = await call("/posts/1e0/comments");

    expect(response.status).toBe(400);
  });
});

describe("search", () => {
  it.each([
    ["a fraction", "2.5"],
    ["a negative number", "-3"],
    ["zero", "0"],
    ["more than the most", "1000"],
  ])("refuses a limit that is %s", async (_label, limit) => {
    const response = await call(`/search?q=hello&v=1&limit=${limit}`);

    expect(response.status).toBe(400);
  });

  it("takes a whole limit in range", async () => {
    const response = await call("/search?q=hello&v=1&limit=2");

    expect(response.status).toBe(200);
  });
});

describe("request body size", () => {
  const MB = 1024 * 1024;

  it("refuses a 12 MB Markdown body with 413", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Huge");
    const contentMarkdown = `${"word ".repeat((12 * MB) / 5)}`;

    const response = await callJson(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { contentMarkdown } },
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
      status: 413,
    });
  });

  it("refuses a body whose Content-Length already says it is too large", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await call("/admin/posts", {
      method: "POST",
      apiKey,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(50 * MB),
      },
      body: JSON.stringify({ data: { title: "Small" } }),
    });

    expect(response.status).toBe(413);
  });

  it("takes a body of a megabyte", async () => {
    const apiKey = await seedAdminApiKey();
    const { id } = await createPost(apiKey, "Long");
    const contentMarkdown = "word ".repeat(MB / 5 / 8);

    const response = await callJson(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { contentMarkdown } },
    });

    expect(response.status).toBe(200);
  });

  it("takes a file upload of the largest size Media allows", async () => {
    const apiKey = await seedAdminApiKey();
    const form = new FormData();
    form.set(
      "image",
      new File([new Uint8Array(9 * MB)], "big.png", { type: "image/png" }),
    );

    const response = await call("/admin/media", {
      method: "POST",
      apiKey,
      body: form,
    });

    // The bytes are not a PNG: refused for that, not for their number.
    expect(response.status).not.toBe(413);
  });

  it("refuses a file upload past the largest size", async () => {
    const apiKey = await seedAdminApiKey();
    const form = new FormData();
    form.set(
      "image",
      new File([new Uint8Array(12 * MB)], "huge.png", { type: "image/png" }),
    );

    const response = await call("/admin/media", {
      method: "POST",
      apiKey,
      body: form,
    });

    expect(response.status).toBe(413);
  });
});
