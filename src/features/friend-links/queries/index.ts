import { queryOptions } from "@tanstack/react-query";
import { getAllFriendLinksFn } from "../api/friend-links.admin.api";
import {
  getApprovedFriendLinksFn,
  getMyFriendLinksFn,
} from "../api/friend-links.user.api";
import type { FriendLinkStatus } from "@/lib/db/schema";

export const FRIEND_LINKS_KEYS = {
  all: ["friend-links"] as const,
  approved: ["friend-links", "approved"] as const,
  mine: ["friend-links", "mine"] as const,
  admin: ["friend-links", "admin"] as const,
};

export function myFriendLinksQuery() {
  return queryOptions({
    queryKey: FRIEND_LINKS_KEYS.mine,
    queryFn: () => getMyFriendLinksFn(),
  });
}

export function approvedFriendLinksQuery() {
  return queryOptions({
    queryKey: FRIEND_LINKS_KEYS.approved,
    queryFn: () => getApprovedFriendLinksFn(),
  });
}

export function allFriendLinksQuery(
  options: {
    offset?: number;
    limit?: number;
    status?: FriendLinkStatus;
  } = {},
) {
  return queryOptions({
    queryKey: [...FRIEND_LINKS_KEYS.admin, options],
    queryFn: () => getAllFriendLinksFn({ data: options }),
  });
}
