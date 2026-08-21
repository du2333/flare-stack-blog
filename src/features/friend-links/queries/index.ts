import type { FriendLinkStatus } from "@/lib/db/schema";
import { orpc } from "@/lib/orpc";

export function myFriendLinksQuery() {
  return orpc.friendLinks.mine.queryOptions();
}

export function approvedFriendLinksQuery() {
  return orpc.friendLinks.listApproved.queryOptions();
}

export function allFriendLinksQuery(
  options: { offset?: number; limit?: number; status?: FriendLinkStatus } = {},
) {
  return orpc.friendLinks.admin.list.queryOptions({ input: options });
}
