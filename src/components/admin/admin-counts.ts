import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import type { AdminNavCount } from "./admin-nav";

/**
 * The sidebar's counts of pending work, from two queries the Admin already
 * has, at their smallest page: the unreplied Comments' total and the pending
 * Friend Links. Whatever handles a Comment invalidates orpc.dashboard.key()
 * (refreshUnrepliedComments) and whatever reviews a Friend Link invalidates
 * orpc.friendLinks.key(), so the counts follow without a request of their own.
 */
export const pendingCommentsCountQuery =
  orpc.dashboard.unrepliedComments.queryOptions({ input: { limit: 1 } });

export const pendingFriendLinksCountQuery =
  orpc.friendLinks.admin.list.queryOptions({
    input: { status: "pending", limit: 1 },
  });

export function useAdminCounts(): Record<AdminNavCount, number> {
  const comments = useQuery({
    ...pendingCommentsCountQuery,
    select: (page) => page.total,
  });
  const friendLinks = useQuery({
    ...pendingFriendLinksCountQuery,
    select: (page) => page.counts.pending,
  });
  return {
    comments: comments.data ?? 0,
    friendLinks: friendLinks.data ?? 0,
  };
}
