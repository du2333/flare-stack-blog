import { describe, expect, it } from "vitest";
import type { DashboardComment, DashboardOverview } from "./dashboard.schema";
import { overviewWithoutComment } from "./unreplied-comments";

const comment = (id: number) => ({ id }) as DashboardComment;

describe("overviewWithoutComment", () => {
  it("drops the comment and counts one fewer", () => {
    const overview = {
      unrepliedComments: { items: [comment(1), comment(2)], total: 7 },
    } as DashboardOverview;
    expect(overviewWithoutComment(overview, 1).unrepliedComments).toEqual({
      items: [comment(2)],
      total: 6,
    });
  });

  it("counts one fewer for a comment beyond the first five", () => {
    const overview = {
      unrepliedComments: { items: [comment(1)], total: 7 },
    } as DashboardOverview;
    expect(overviewWithoutComment(overview, 9).unrepliedComments.total).toBe(6);
  });
});
