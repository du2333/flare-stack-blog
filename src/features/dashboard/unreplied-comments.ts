import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";

/** The overview as it reads once Comment `id` has left the unreplied list. */
export function overviewWithoutComment(
  overview: DashboardOverview,
  id: number,
): DashboardOverview {
  const { items, total } = overview.unrepliedComments;
  return {
    ...overview,
    unrepliedComments: {
      items: items.filter((comment) => comment.id !== id),
      total: Math.max(0, total - 1),
    },
  };
}
