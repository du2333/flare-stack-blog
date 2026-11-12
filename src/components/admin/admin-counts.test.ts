import { partialMatchKey } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { orpc } from "@/lib/orpc";
import {
  pendingCommentsCountQuery,
  pendingFriendLinksCountQuery,
} from "./admin-counts";

it("refreshes with what handling a Comment or reviewing a Friend Link invalidates", () => {
  // refreshUnrepliedComments and useAdminFriendLinks invalidate these.
  expect(
    partialMatchKey(pendingCommentsCountQuery.queryKey, orpc.dashboard.key()),
  ).toBe(true);
  expect(
    partialMatchKey(
      pendingFriendLinksCountQuery.queryKey,
      orpc.friendLinks.key(),
    ),
  ).toBe(true);
});

it("is left alone by the optimistic update of the unreplied sheet's pages", () => {
  expect(
    partialMatchKey(
      pendingCommentsCountQuery.queryKey,
      orpc.dashboard.unrepliedComments.key({ type: "infinite" }),
    ),
  ).toBe(false);
});
