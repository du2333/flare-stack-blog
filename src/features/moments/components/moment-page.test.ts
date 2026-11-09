// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { MomentPage } from "./moment-page";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) =>
    createElement("a", null, children),
}));

// The card and the comment section have tests of their own.
vi.mock("@/features/moments/components/moment-card", () => ({
  MomentCard: () => createElement("article", null, "the card"),
}));
const section = vi.hoisted(() => vi.fn());
vi.mock("@/features/comments/components/comment-section", () => ({
  CommentSection: (props: { target: unknown }) => {
    section(props);
    return null;
  },
}));

afterEach(cleanup);

it("puts the Moment's comment section under its card, on the Moment as target", () => {
  const moment: PublicMoment = {
    id: 7,
    text: "words",
    images: [],
    video: null,
    postedAt: new Date(0),
    updatedAt: new Date(0),
    commentCount: 2,
  };
  render(createElement(MomentPage, { moment }));

  expect(screen.getByText("the card")).toBeTruthy();
  expect(section).toHaveBeenCalledWith({ target: { type: "moment", id: 7 } });
});
