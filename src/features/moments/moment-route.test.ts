// @vitest-environment jsdom
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";

function router() {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: {} as never,
  });
}

/** What a route's search schema makes of a search, or an exception for one it refuses. */
function parseSearch(
  route: { options: { validateSearch?: unknown } },
  search: Record<string, unknown>,
) {
  const schema = route.options.validateSearch as unknown as {
    "~standard": { validate: (input: unknown) => unknown };
  };
  const result = schema["~standard"].validate(search) as {
    value?: { comment?: number };
    issues?: Array<unknown>;
  };
  if (result.issues) throw new Error("refused");
  return result.value;
}

it("takes the comment a link names as a number on a Moment's page, and none when it names none", () => {
  const route = router().routesById["/_public/moments/$id"];

  expect(parseSearch(route, { comment: "12" })).toEqual({ comment: 12 });
  expect(parseSearch(route, { comment: 12 })).toEqual({ comment: 12 });
  expect(parseSearch(route, {})).toEqual({});
  expect(() => parseSearch(route, { comment: "abc" })).toThrow();
});

it("writes a Comment's public link as /moments/<id>?comment=<cid>, and the count link as the comment section", () => {
  const { buildLocation } = router();

  expect(
    buildLocation({
      to: "/moments/$id",
      params: { id: "7" },
      search: { comment: 33 },
    }).href,
  ).toBe("/moments/7?comment=33");
  expect(
    buildLocation({
      to: "/moments/$id",
      params: { id: "7" },
      hash: "comments",
    }).href,
  ).toBe("/moments/7#comments");
});

it("keeps the Post page's comment search param as it was", () => {
  const route = router().routesById["/_public/post/$slug"];

  expect(parseSearch(route, { comment: "3" })).toEqual({ comment: 3 });
});
