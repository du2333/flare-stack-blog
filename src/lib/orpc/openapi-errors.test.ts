import { describe, expect, it } from "vitest";
import { openAPIHandler } from "./openapi-handler";

// The OpenAPI document is how an agent learns the API, so the errors it
// declares must be the ones an operation can really answer: a code that never
// comes misleads the agent as much as a missing one.

type Schema = { oneOf?: Array<Schema>; properties?: Record<string, Schema> } & {
  const?: unknown;
  $ref?: string;
};
type Operation = {
  responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
};

const { response } = await openAPIHandler.handle(
  new Request("http://localhost/api/spec.json"),
  { prefix: "/api", context: {} as never },
);
if (!response) throw new Error("No route served /api/spec.json");
const doc = (await response.json()) as {
  paths: Record<string, Record<string, Operation>>;
  components?: { schemas?: Record<string, Schema> };
};

/** The schema a `$ref` points to, or the schema itself. */
function resolve(schema: Schema): Schema {
  const name = schema.$ref?.replace("#/components/schemas/", "");
  return (name && doc.components?.schemas?.[name]) || schema;
}

/** The `STATUS CODE` of every defined error an operation declares, sorted. */
function declaredErrors(method: string, path: string): Array<string> {
  const operation = doc.paths[path]?.[method];
  if (!operation) throw new Error(`${method.toUpperCase()} ${path} is missing`);
  return Object.entries(operation.responses ?? {})
    .flatMap(([status, entry]) =>
      (entry.content?.["application/json"]?.schema?.oneOf ?? []).flatMap(
        (reference) => {
          const alternative = resolve(reference);
          const code = alternative.properties?.code?.const;
          return alternative.properties?.defined?.const === true &&
            typeof code === "string"
            ? [`${status} ${code}`]
            : [];
        },
      ),
    )
    .sort();
}

/** What every admin operation answers for a missing or insufficient key. */
const adminAccess = ["401 UNAUTHORIZED", "403 FORBIDDEN"];

function adminErrors(method: string, path: string, ...own: Array<string>) {
  return {
    actual: declaredErrors(method, path),
    expected: [...adminAccess, ...own].sort(),
  };
}

describe("errors declared by post operations", () => {
  it.each([
    [
      "post",
      "/admin/posts/{id}/publish",
      [
        "400 PUBLISHED_AT_IN_FUTURE",
        "404 POST_NOT_FOUND",
        "409 EDIT_CONFLICT",
        "409 PUBLIC_SLUG_TAKEN",
        "413 POST_CONTENT_TOO_LARGE",
      ],
    ],
    ["post", "/admin/posts/{id}/unpublish", ["404 POST_NOT_FOUND"]],
    ["delete", "/admin/posts/{id}", ["404 POST_NOT_FOUND"]],
    ["post", "/admin/posts/{id}/pin", ["404 POST_NOT_FOUND"]],
    ["get", "/admin/posts/{id}", ["404 POST_NOT_FOUND"]],
    [
      "patch",
      "/admin/posts/{id}",
      [
        "400 CONTENT_FORMAT_AMBIGUOUS",
        "400 CONTENT_IMAGE_NOT_FOUND",
        "400 CONTENT_JSON_INVALID",
        "400 CONTENT_LINK_INVALID",
        "400 MARKDOWN_IMAGE_INVALID",
        "404 CATEGORY_NOT_FOUND",
        "404 MEDIA_NOT_FOUND",
        "404 POST_NOT_FOUND",
        "409 EDIT_CONFLICT",
        "409 SLUG_TAKEN",
        "413 POST_CONTENT_TOO_LARGE",
      ],
    ],
    [
      "post",
      "/admin/posts",
      [
        "400 CONTENT_FORMAT_AMBIGUOUS",
        "400 CONTENT_IMAGE_NOT_FOUND",
        "400 CONTENT_JSON_INVALID",
        "400 CONTENT_LINK_INVALID",
        "400 MARKDOWN_IMAGE_INVALID",
        "413 POST_CONTENT_TOO_LARGE",
      ],
    ],
    [
      "post",
      "/admin/posts/{id}/discard-changes",
      [
        "404 POST_NOT_FOUND",
        "409 EDIT_CONFLICT",
        "409 NO_UNPUBLISHED_CHANGES",
        "409 POST_NOT_PUBLISHED",
        "409 SLUG_TAKEN",
      ],
    ],
    [
      "get",
      "/admin/posts/{postId}/revisions/{revisionId}",
      ["404 POST_REVISION_NOT_FOUND"],
    ],
    [
      "post",
      "/admin/posts/{postId}/revisions/{revisionId}/restore",
      [
        "400 POST_REVISION_INVALID_SNAPSHOT",
        "404 POST_NOT_FOUND",
        "404 POST_REVISION_NOT_FOUND",
        "409 EDIT_CONFLICT",
        "409 SLUG_TAKEN",
      ],
    ],
    ["delete", "/admin/posts/{postId}/revisions", ["404 POST_NOT_FOUND"]],
    ["get", "/admin/posts", []],
    ["get", "/admin/posts/{postId}/revisions", ["404 POST_NOT_FOUND"]],
  ] as Array<[string, string, Array<string>]>)("%s %s", (method, path, own) => {
    const { actual, expected } = adminErrors(method, path, ...own);
    expect(actual).toEqual(expected);
  });
});

describe("errors declared by tag, category and media operations", () => {
  it.each([
    ["get", "/admin/tags", []],
    ["post", "/admin/tags", ["409 TAG_NAME_ALREADY_EXISTS"]],
    [
      "patch",
      "/admin/tags/{id}",
      ["404 TAG_NOT_FOUND", "409 TAG_NAME_ALREADY_EXISTS"],
    ],
    ["delete", "/admin/tags/{id}", ["404 TAG_NOT_FOUND"]],
    [
      "put",
      "/admin/posts/{postId}/tags",
      ["404 POST_NOT_FOUND", "404 TAG_NOT_FOUND", "409 EDIT_CONFLICT"],
    ],
    ["get", "/admin/posts/{postId}/tags", ["404 POST_NOT_FOUND"]],
    ["post", "/admin/categories", ["409 CATEGORY_NAME_ALREADY_EXISTS"]],
    [
      "patch",
      "/admin/categories/{id}",
      ["404 CATEGORY_NOT_FOUND", "409 CATEGORY_NAME_ALREADY_EXISTS"],
    ],
    ["delete", "/admin/categories/{id}", ["404 CATEGORY_NOT_FOUND"]],
    ["get", "/admin/media", []],
    [
      "post",
      "/admin/media",
      ["400 MEDIA_INVALID", "500 MEDIA_RECORD_CREATE_FAILED"],
    ],
    [
      "post",
      "/admin/media/import",
      [
        "400 MEDIA_IMPORT_FAILED",
        "400 MEDIA_INVALID",
        "400 MEDIA_INVALID_URL",
        "500 MEDIA_RECORD_CREATE_FAILED",
      ],
    ],
    [
      "delete",
      "/admin/media/{key}",
      ["404 MEDIA_NOT_FOUND", "409 MEDIA_IN_USE"],
    ],
    ["patch", "/admin/media/{key}", ["404 MEDIA_NOT_FOUND"]],
    ["get", "/admin/media/{key}/posts", ["404 MEDIA_NOT_FOUND"]],
    [
      "post",
      "/admin/media/{key}/replace",
      ["400 MEDIA_INVALID", "404 MEDIA_NOT_FOUND"],
    ],
  ] as Array<[string, string, Array<string>]>)("%s %s", (method, path, own) => {
    const { actual, expected } = adminErrors(method, path, ...own);
    expect(actual).toEqual(expected);
  });
});

describe("rate limit and Turnstile errors", () => {
  const adminOperations = Object.entries(doc.paths)
    .filter(([path]) => path.startsWith("/admin/"))
    .flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => [method, path] as const),
    );

  it("finds the admin operations", () => {
    expect(adminOperations.length).toBeGreaterThan(50);
  });

  it("is declared by no admin operation", () => {
    const declaring = adminOperations
      .filter(([method, path]) =>
        declaredErrors(method, path).some((error) =>
          /RATE_LIMITED|TURNSTILE_FAILED/.test(error),
        ),
      )
      .map(([method, path]) => `${method.toUpperCase()} ${path}`);
    expect(declaring).toEqual([]);
  });

  it("is declared by the public operations that run the middleware", () => {
    expect(declaredErrors("post", "/posts/{postId}/comments")).toEqual(
      expect.arrayContaining(["400 TURNSTILE_FAILED", "429 RATE_LIMITED"]),
    );
    expect(declaredErrors("post", "/moments/{momentId}/comments")).toEqual(
      expect.arrayContaining(["400 TURNSTILE_FAILED", "429 RATE_LIMITED"]),
    );
    expect(declaredErrors("delete", "/comments/{id}")).toContain(
      "429 RATE_LIMITED",
    );
    expect(declaredErrors("delete", "/comments/{id}")).not.toContain(
      "400 TURNSTILE_FAILED",
    );
    expect(declaredErrors("post", "/friend-links")).toEqual(
      expect.arrayContaining(["400 TURNSTILE_FAILED", "429 RATE_LIMITED"]),
    );
  });

  it("is declared by the Pairing Code exchange, with its one not found", () => {
    expect(declaredErrors("post", "/pairing")).toEqual([
      "401 UNAUTHORIZED",
      "403 FORBIDDEN",
      "404 PAIRING_CODE_NOT_FOUND",
      "429 RATE_LIMITED",
    ]);
  });

  it("is declared by no operation that does not run the middleware", () => {
    expect(declaredErrors("get", "/posts")).not.toContain("429 RATE_LIMITED");
    expect(declaredErrors("get", "/me/comments")).not.toContain(
      "429 RATE_LIMITED",
    );
  });
});
