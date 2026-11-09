// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { MomentPage } from "./moment-page";

const route = vi.hoisted(() => ({
  hash: "",
  comment: undefined as number | undefined,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) =>
    createElement("a", null, children),
  useLocation: ({ select }: { select: (l: { hash: string }) => unknown }) =>
    select({ hash: route.hash }),
  useSearch: ({ select }: { select: (s: object) => unknown }) =>
    select({ comment: route.comment }),
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

afterEach(() => {
  cleanup();
  document.getElementById("comments")?.remove();
  route.hash = "";
  route.comment = undefined;
  vi.unstubAllGlobals();
});

const moment: PublicMoment = {
  id: 7,
  text: "words",
  images: [],
  video: null,
  postedAt: new Date(0),
  updatedAt: new Date(0),
  commentCount: 2,
};

function stubLayout() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const scroll = vi.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  return scroll;
}

function addCommentsSection() {
  const el = document.createElement("section");
  el.id = "comments";
  document.body.appendChild(el);
}

it("puts the Moment's comment section under its card, on the Moment as target", () => {
  render(createElement(MomentPage, { moment }));

  expect(screen.getByText("the card")).toBeTruthy();
  expect(section).toHaveBeenCalledWith({ target: { type: "moment", id: 7 } });
});

it("lands on the comment section, heading at the top, once it has loaded after a #comments arrival", async () => {
  const scroll = stubLayout();
  route.hash = "comments";
  render(createElement(MomentPage, { moment }));
  expect(scroll).not.toHaveBeenCalled();
  addCommentsSection();
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  expect(scroll).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
});

it("leaves the scroll alone without #comments, and to the ?comment= scroll when a comment is named", async () => {
  const scroll = stubLayout();
  addCommentsSection();
  render(createElement(MomentPage, { moment }));
  cleanup();
  route.hash = "comments";
  route.comment = 5;
  render(createElement(MomentPage, { moment }));
  await new Promise((resolve) => setTimeout(resolve, 80));
  expect(scroll).not.toHaveBeenCalled();
});
