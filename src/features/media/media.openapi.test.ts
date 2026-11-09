import { describe, expect, it } from "vitest";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";
import { ACCEPTED_IMAGE_TYPES } from "./media.schema";

// An agent learns the media operations from the OpenAPI document alone, so
// it must offer only the request body the server accepts and say what each
// operation does.

type Operation = {
  description?: string;
  requestBody?: {
    content?: Record<
      string,
      {
        schema?: {
          properties?: Record<string, Record<string, unknown>>;
          required?: Array<string>;
        };
        encoding?: Record<string, { contentType?: string }>;
      }
    >;
  };
};

const { response } = await openAPIHandler.handle(
  new Request("http://localhost/api/spec.json"),
  { prefix: "/api", context: {} as never },
);
if (!response) throw new Error("No route served /api/spec.json");
const doc = (await response.json()) as {
  paths: Record<string, Record<string, Operation>>;
};

const mediaOperations = Object.entries(doc.paths)
  .filter(([path]) => path.startsWith("/admin/media"))
  .flatMap(([path, methods]) =>
    Object.entries(methods).map(
      ([method, operation]) =>
        [`${method.toUpperCase()} ${path}`, operation] as const,
    ),
  );

describe("media operations in the OpenAPI document", () => {
  it("finds every media operation", () => {
    expect(mediaOperations).toHaveLength(12);
  });

  it.each(mediaOperations)("%s has a description", (_name, operation) => {
    expect(operation.description?.length).toBeGreaterThan(20);
  });

  it.each([
    ["post", "/admin/media"],
    ["post", "/admin/media/{key}/replace"],
  ])("%s %s takes the file only as multipart/form-data", (method, path) => {
    const content = doc.paths[path]?.[method]?.requestBody?.content ?? {};

    expect(Object.keys(content)).toEqual(["multipart/form-data"]);
    const multipart = content["multipart/form-data"];
    expect(multipart?.schema?.required).toEqual(["image"]);
    expect(multipart?.schema?.properties?.image).toMatchObject({
      type: "string",
      format: "binary",
    });
    expect(multipart?.encoding?.image?.contentType?.split(", ")).toEqual(
      ACCEPTED_IMAGE_TYPES,
    );
  });
});
