import { OpenAPIHandler } from "@orpc/openapi/fetch";
import {
  getLazyMeta,
  isLazy,
  isProcedure,
  LAZY_SYMBOL,
  type Lazy,
  unlazy,
} from "@orpc/server";
import { describe, expect, it } from "vitest";
import { router } from "./router";

type Node = Record<string, unknown> | Lazy<unknown>;

/** Every lazy router in the tree, keyed by its dotted path, loading it all. */
async function collectLazies(node: unknown, path: string[] = []) {
  const found = new Map<string, Lazy<unknown>>();
  if (isLazy(node)) {
    found.set(path.join("."), node);
    const { default: loaded } = await unlazy(node);
    for (const [key, value] of await collectLazies(loaded, path)) {
      found.set(key, value);
    }
  } else if (!isProcedure(node) && typeof node === "object" && node) {
    for (const [key, child] of Object.entries(node)) {
      for (const [p, value] of await collectLazies(child, [...path, key])) {
        found.set(p, value);
      }
    }
  }
  return found;
}

async function routesUnder(node: unknown): Promise<string[]> {
  const { default: loaded } = await unlazy(node as Node);
  if (isProcedure(loaded)) return [loaded["~orpc"].route.path ?? ""];
  const children = Object.values(loaded as Record<string, unknown>);
  return (await Promise.all(children.map(routesUnder))).flat();
}

describe("lazy oRPC router", () => {
  it("gives every lazy router a prefix all of its routes start with", async () => {
    const lazies = await collectLazies(router);
    expect([...lazies.keys()]).toContain("posts.admin");
    for (const [path, lazied] of lazies) {
      const { prefix } = getLazyMeta(lazied);
      // Without a prefix the OpenAPI matcher loads the router on any request.
      expect(prefix, path).toBeDefined();
      for (const route of await routesUnder(lazied)) {
        expect(route.startsWith(prefix!), `${path}: ${route}`).toBe(true);
      }
    }
  });

  it("loads only the lazy routers whose prefix a request matches", async () => {
    // Count the loads by wrapping each lazy router's loader.
    const loaded: string[] = [];
    for (const [path, lazied] of await collectLazies(router)) {
      const holder = lazied[LAZY_SYMBOL];
      const loader = holder.loader;
      holder.loader = () => {
        loaded.push(path);
        return loader();
      };
    }
    const handler = new OpenAPIHandler(router);
    const request = (path: string) =>
      handler.handle(new Request(`http://localhost/api${path}`), {
        prefix: "/api",
        context: {} as never,
      });

    await request("/tags");
    await request("/posts/a-slug/comments");
    await request("/moments/1/comments");
    expect(loaded).toEqual([]);

    await request("/admin/dashboard");
    // tags.admin also serves /admin/posts/{postId}/tags, so its prefix is /admin.
    expect([...loaded].sort()).toEqual(["dashboard", "tags.admin"]);
  });
});
