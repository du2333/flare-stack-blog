import {
  type AnyContractProcedure,
  isContractProcedure,
  oc,
} from "@orpc/contract";
import { unlazyRouter } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { router } from "../src/lib/orpc/router";
import { browserContractRouter } from "./browser-contract";

/** Every procedure under `node` with its dotted path. */
function proceduresOf(
  node: unknown,
  path: string[] = [],
): Array<{ name: string; node: AnyContractProcedure }> {
  if (isContractProcedure(node)) return [{ name: path.join("."), node }];
  if (typeof node !== "object" || node === null) return [];
  return Object.entries(node).flatMap(([key, child]) =>
    proceduresOf(child, [...path, key]),
  );
}

describe("browserContractRouter", () => {
  it("keeps the method and path and drops the documentation", () => {
    const contract = {
      posts: {
        bySlug: oc
          .route({
            method: "GET",
            path: "/posts/{slug}",
            summary: "Get a post",
            description: "Long text.",
            tags: ["Posts"],
            successStatus: 201,
          })
          .errors({ POST_NOT_FOUND: { status: 404 } }),
      },
    };

    expect(browserContractRouter(contract)).toEqual({
      posts: {
        bySlug: {
          "~orpc": {
            errorMap: {},
            meta: {},
            route: { method: "GET", path: "/posts/{slug}" },
          },
        },
      },
    });
  });

  it("keeps the method and path of every procedure of the router", async () => {
    const full = await unlazyRouter(router);
    const original = proceduresOf(full);
    const browser = proceduresOf(browserContractRouter(full));

    expect(original.length).toBeGreaterThan(100);
    expect(browser.map(({ name }) => name)).toEqual(
      original.map(({ name }) => name),
    );
    for (const [index, { name, node }] of browser.entries()) {
      const { route } = node["~orpc"];
      const { method, path } = original[index]!.node["~orpc"].route;
      expect(path, name).toBeTypeOf("string");
      expect(route, name).toStrictEqual({ method, path });
    }
  });
});
