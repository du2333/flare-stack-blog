import { expect, it, vi } from "vitest";
import { adminCommentsQuery, type AdminCommentsParams } from "./admin";

vi.mock("@/lib/orpc", async () => {
  const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
  return {
    orpc: createTanstackQueryUtils({
      comments: {
        admin: { list: async () => ({}), commentedPosts: async () => [] },
      },
    }),
  };
});

function sent(params: AdminCommentsParams) {
  return (adminCommentsQuery(params).queryKey[1] as { input: unknown }).input;
}

it("sends neither the search nor the Post for the 待回复 view, which has no field for them", () => {
  expect(
    sent({ view: "unreplied", page: 1, search: "zzz", postId: 3 }),
  ).toEqual({ view: "unreplied", offset: 0, limit: 20 });
});

it("sends them for the 全部 view, paged", () => {
  expect(sent({ view: "all", page: 2, search: " zzz ", postId: 3 })).toEqual({
    view: "all",
    search: "zzz",
    postId: 3,
    offset: 20,
    limit: 20,
  });
});
