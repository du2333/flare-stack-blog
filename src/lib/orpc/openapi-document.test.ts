import { type OpenAPI, OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { describe, expect, it, vi } from "vitest";
import { operationsOf } from "./openapi-document";
import { handleApiRequest } from "./openapi-handler";
import { isBrowserSessionOnly } from "./procedure";
import { router } from "./router";

// The whole document is too large for an agent to read at the start of every
// task, so it reads the index, then a subset holding just the operations it
// will call. Both must say everything the whole document says about those.

const generate = vi.spyOn(OpenAPIGenerator.prototype, "generate");

function get(path: string, method = "GET") {
  return handleApiRequest(
    new Request(`http://localhost/api${path}`, { method }),
    {} as never,
  );
}

async function documentAt(path: string) {
  const response = await get(path);
  expect(response.status, path).toBe(200);
  return (await response.json()) as OpenAPI.Document;
}

/** Every `$ref` under `node`. */
function refsIn(node: unknown, refs: Array<string> = []): Array<string> {
  if (Array.isArray(node)) {
    for (const child of node) refsIn(child, refs);
  } else if (typeof node === "object" && node !== null) {
    const record = node as Record<string, unknown>;
    if (typeof record.$ref === "string") refs.push(record.$ref);
    for (const child of Object.values(record)) refsIn(child, refs);
  }
  return refs;
}

/** The `$ref`s of `doc` that name nothing in it. */
function danglingRefs(doc: OpenAPI.Document) {
  const components = (doc.components ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  return refsIn(doc).filter((ref) => {
    const [, section, name] = /^#\/components\/([^/]+)\/(.+)$/.exec(ref) ?? [];
    return !section || !name || components[section]?.[name] === undefined;
  });
}

/** Every description in `node`. */
function descriptionsIn(node: unknown, found = new Set<string>()) {
  if (Array.isArray(node)) {
    for (const child of node) descriptionsIn(child, found);
  } else if (typeof node === "object" && node !== null) {
    const record = node as Record<string, unknown>;
    if (typeof record.description === "string") found.add(record.description);
    for (const child of Object.values(record)) descriptionsIn(child, found);
  }
  return found;
}

type OperationEntry = ReturnType<typeof operationsOf>[number];
const signature = ({ path, method, operation }: OperationEntry) =>
  `${method.toUpperCase()} ${path} ${operation.operationId}`;

const full = await documentAt("/spec.json");
const operations = operationsOf(full);

describe("the whole document", () => {
  it("is generated once and kept", async () => {
    await get("/spec/index.json");
    await get("/spec.json?operationIds=posts.admin.get");
    await get("/docs");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("defines the schemas operations share once, losing no description", async () => {
    const inlined = await new OpenAPIGenerator({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }).generate(router, {
      filter: ({ contract }) => !isBrowserSessionOnly(contract),
    });

    expect(Object.keys(full.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([
        "TipTapNode",
        "PostItem",
        "Tag",
        "Category",
        "Media",
        "UnauthorizedError",
        "PostNotFoundError",
        // Posts and Moments answer EDIT_CONFLICT each with its own message.
        "PostsEditConflictError",
        "MomentsEditConflictError",
        "MomentNotFoundError",
      ]),
    );
    expect(danglingRefs(full)).toEqual([]);
    const kept = descriptionsIn(full);
    const lost = [...descriptionsIn(inlined)].filter(
      (description) => !kept.has(description),
    );
    expect(lost).toEqual([]);
    expect(JSON.stringify(full).length).toBeLessThan(
      JSON.stringify(inlined).length * 0.7,
    );
  });

  it("leaves out the operations an API Key cannot call", () => {
    const ids = operations.map(({ operation }) => operation.operationId);
    expect(ids).toContain("pairing.exchange");
    expect(ids.filter((id) => id?.startsWith("pairing.admin."))).toEqual([]);
    expect(Object.keys(full.paths ?? {})).not.toContain("/admin/pairing-code");
  });

  it("answers its paths to GET only", async () => {
    for (const path of ["/spec.json", "/spec/index.json", "/docs"]) {
      const response = await get(path, "POST");
      expect(response.status, path).toBe(405);
      expect(response.headers.get("allow"), path).toBe("GET");
      expect(await response.json()).toMatchObject({
        code: "METHOD_NOT_ALLOWED",
      });
    }
  });

  it("renders the API reference from the document", async () => {
    const response = await get("/docs");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain(
      '"url":"http://localhost/api/spec.json"',
    );
  });
});

describe("the index", () => {
  it("stays a few thousand tokens", async () => {
    const response = await get("/spec/index.json");
    expect((await response.text()).length).toBeLessThan(25_000);
  });

  it("lists every operation with its id, summary and tags, and the API-wide rules", async () => {
    const index = await documentAt("/spec/index.json");

    expect(index.info).toEqual(full.info);
    expect(index.servers).toEqual(full.servers);
    expect(operationsOf(index).map(signature)).toEqual(
      operationsOf(full).map(signature),
    );
    for (const { path, method, operation } of operationsOf(full)) {
      expect(index.paths?.[path]?.[method]).toEqual({
        operationId: operation.operationId,
        summary: operation.summary,
        tags: operation.tags,
      });
      expect(operation.summary, operation.operationId).toBeTruthy();
    }
  });

  it("says how to read the document in parts", async () => {
    const { info } = await documentAt("/spec/index.json");
    expect(info.description).toMatch(/^## Reading this document/);
    expect(info.description).toContain("/api/spec/index.json");
    expect(info.description).toContain("/api/spec.json?operationIds=");
  });

  it("takes no query", async () => {
    expect((await get("/spec/index.json?tags=Posts")).status).toBe(400);
  });
});

describe("a subset", () => {
  function expectValid(subset: OpenAPI.Document, chosen: Array<string>) {
    expect(subset.openapi).toMatch(/^3\.1\./);
    expect(subset.info.title).toBe(full.info.title);
    expect(subset.info.version).toBe(full.info.version);
    expect(subset.servers).toEqual(full.servers);
    expect(operationsOf(subset).map(signature)).toEqual(
      operations
        .filter(({ operation }) => chosen.includes(operation.operationId!))
        .map(signature),
    );
    for (const { path, method, operation } of operationsOf(subset)) {
      expect(operation).toEqual(full.paths?.[path]?.[method]);
    }
    expect(danglingRefs(subset)).toEqual([]);
    // Nothing it does not use: every schema is referenced from inside it.
    const referenced = new Set(refsIn(subset));
    for (const name of Object.keys(subset.components?.schemas ?? {})) {
      expect(referenced, name).toContain(`#/components/schemas/${name}`);
      expect(subset.components?.schemas?.[name]).toEqual(
        full.components?.schemas?.[name],
      );
    }
  }

  it.each(operations.map(({ operation }) => operation.operationId!))(
    "of %s is a valid document holding just that operation",
    async (operationId) => {
      const subset = await documentAt(`/spec.json?operationIds=${operationId}`);
      expectValid(subset, [operationId]);
    },
  );

  it("holds every operation of the tags it names, and those it names by id", async () => {
    const subset = await documentAt(
      "/spec.json?tags=Admin%20Tags,Admin%20Media&operationIds=posts.admin.get&operationIds=posts.admin.publish",
    );
    expectValid(
      subset,
      operations
        .filter(
          ({ operation }) =>
            operation.tags?.some((tag) =>
              ["Admin Tags", "Admin Media"].includes(tag),
            ) ||
            ["posts.admin.get", "posts.admin.publish"].includes(
              operation.operationId!,
            ),
        )
        .map(({ operation }) => operation.operationId!),
    );
  });

  it("of Admin Posts holds every write to a Post's draft, setting its Tags included", async () => {
    const subset = await documentAt("/spec.json?tags=Admin%20Posts");
    const ids = operationsOf(subset).map(
      ({ operation }) => operation.operationId,
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        "posts.admin.update",
        "tags.admin.setPostTags",
        "posts.admin.publish",
      ]),
    );
    const update = operationsOf(subset).find(
      ({ operation }) => operation.operationId === "posts.admin.update",
    );
    expect(update?.operation.description).toContain("tags.admin.setPostTags");
  });

  it("of Admin Posts states each long description once", async () => {
    const subset = await documentAt("/spec.json?tags=Admin%20Posts");
    const seen = new Map<string, number>();
    const count = (node: unknown) => {
      if (Array.isArray(node)) node.forEach(count);
      else if (typeof node === "object" && node !== null) {
        const { description } = node as { description?: unknown };
        if (typeof description === "string" && description.length > 200) {
          seen.set(description, (seen.get(description) ?? 0) + 1);
        }
        Object.values(node).forEach(count);
      }
    };
    count(subset);
    const repeated = [...seen].filter(([, times]) => times > 1);
    expect(repeated.map(([text]) => text.slice(0, 80))).toEqual([]);
  });

  it("points to the index for the API-wide rules instead of repeating them", async () => {
    const subset = await documentAt("/spec.json?operationIds=posts.admin.get");
    expect(subset.info.description).toContain("/api/spec/index.json");
    expect(subset.info.description!.length).toBeLessThan(300);
  });

  it("answers 404 naming the ids and tags no operation has", async () => {
    const response = await get(
      "/spec.json?operationIds=posts.admin.get,posts.nope&tags=Nope",
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: "OPERATION_NOT_FOUND",
      data: { operationIds: ["posts.nope"], tags: ["Nope"] },
    });
  });

  it("answers 400 to a query it does not take", async () => {
    for (const query of ["?operationId=posts.admin.get", "?index", "?tags="]) {
      const response = await get(`/spec.json${query}`);
      expect(response.status, query).toBe(400);
      expect(await response.json()).toMatchObject({ code: "BAD_REQUEST" });
    }
  });
});
