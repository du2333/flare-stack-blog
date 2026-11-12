// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { DashboardComment } from "@/features/dashboard/dashboard.schema";
import { m } from "@/paraglide/messages";
import { OverviewComments, OverviewFriendLinks } from "./overview-inbox";

const calls = vi.hoisted(() => ({
  markHandled: vi.fn(),
  createComment: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
}));

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: ReactNode }) =>
    createElement("a", rest, children),
}));
vi.mock("@/components/common/turnstile", () => ({
  Turnstile: () => null,
  useTurnstile: () => ({
    isPending: false,
    reset: vi.fn(),
    turnstileProps: {},
  }),
}));
vi.mock("@/features/dashboard/hooks/use-handled-comments", () => ({
  refreshUnrepliedComments: vi.fn(async () => {}),
  useHandledComments: () => ({ markHandledAsync: calls.markHandled }),
}));
vi.mock("@/features/comments/hooks/use-comments", () => ({
  useComments: () => ({
    createComment: calls.createComment,
    isCreating: false,
  }),
}));
vi.mock("@/features/friend-links/hooks/use-friend-links", () => ({
  useAdminFriendLinks: () => ({
    approveAsync: calls.approve,
    rejectAsync: calls.reject,
  }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  for (const call of Object.values(calls)) call.mockReset();
  toasts.error.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function comment(change: Partial<DashboardComment>): DashboardComment {
  return {
    id: 1,
    postId: 7,
    momentId: null,
    rootId: null,
    userId: "reader",
    userName: "Reader",
    userImage: null,
    userMuted: false,
    postTitle: "A post",
    postSlug: "a-post",
    momentTitle: null,
    commentPath: "/post/a-post#comment-1",
    snippet: "A comment",
    createdAt: new Date(0),
    ...change,
  };
}

const wrap = (node: ReturnType<typeof createElement>) =>
  render(
    createElement(QueryClientProvider, { client: new QueryClient() }, node),
  );

const rows = () =>
  [...document.querySelectorAll(".overview-item")].map((row) => ({
    text: row.querySelector("b")?.textContent,
    leaving: row.hasAttribute("data-leaving"),
  }));

/** Past the slide-out, then the promise of the change. */
async function slide() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
}

it("marks a Comment handled after its row slides out, and counts it off", async () => {
  calls.markHandled.mockResolvedValue({});
  wrap(
    createElement(OverviewComments, {
      comments: [comment({ id: 1 }), comment({ id: 2, userName: "Other" })],
      total: 5,
    }),
  );
  fireEvent.click(
    screen.getAllByRole("button", {
      name: m.dashboard_comment_mark_handled(),
    })[0]!,
  );
  expect(rows()).toEqual([
    { text: "Reader", leaving: true },
    { text: "Other", leaving: false },
  ]);
  expect(calls.markHandled).not.toHaveBeenCalled();
  await slide();
  expect(calls.markHandled).toHaveBeenCalledWith(1);
  expect(rows()).toEqual([{ text: "Other", leaving: false }]);
  expect(document.querySelector(".overview-count")?.textContent).toBe("4");
});

it("brings a row back when marking it handled fails", async () => {
  calls.markHandled.mockRejectedValue(new Error("offline"));
  wrap(createElement(OverviewComments, { comments: [comment({})], total: 1 }));
  fireEvent.click(
    screen.getByRole("button", { name: m.dashboard_comment_mark_handled() }),
  );
  await slide();
  expect(calls.markHandled).toHaveBeenCalledOnce();
  expect(rows()).toEqual([{ text: "Reader", leaving: false }]);
});

it("replies in place to the Comment, in its thread, then lets the row go", async () => {
  calls.createComment.mockResolvedValue({});
  wrap(
    createElement(OverviewComments, {
      comments: [comment({ id: 3, rootId: 2 })],
      total: 1,
    }),
  );
  const box = screen.getByRole("textbox", {
    name: m.comments_item_reply_to({ name: "Reader" }),
  });
  expect(box.closest("[inert]")).not.toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: m.comments_item_reply() }),
  );
  expect(box.closest("[inert]")).toBeNull();
  const send = screen.getByRole("button", {
    name: m.admin_overview_reply_send(),
  });
  expect((send as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(box, { target: { value: "  Thanks!  " } });
  await act(async () => {
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
  });
  expect(calls.createComment).toHaveBeenCalledWith(
    expect.objectContaining({
      postId: 7,
      content: "Thanks!",
      rootId: 2,
      replyToCommentId: 3,
    }),
  );
  expect(rows()).toEqual([{ text: "Reader", leaving: true }]);
});

it("keeps the reply and the row when sending fails", async () => {
  calls.createComment.mockRejectedValue(new Error("nope"));
  wrap(createElement(OverviewComments, { comments: [comment({})], total: 1 }));
  fireEvent.click(
    screen.getByRole("button", { name: m.comments_item_reply() }),
  );
  const box = screen.getByRole("textbox");
  fireEvent.change(box, { target: { value: "Thanks" } });
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: m.admin_overview_reply_send() }),
    );
  });
  expect((box as HTMLTextAreaElement).value).toBe("Thanks");
  expect(rows()).toEqual([{ text: "Reader", leaving: false }]);
});

it("says when the last of the shown Comments is answered but more wait on the Comments page", async () => {
  calls.markHandled.mockResolvedValue({});
  wrap(createElement(OverviewComments, { comments: [comment({})], total: 4 }));
  fireEvent.click(
    screen.getByRole("button", { name: m.dashboard_comment_mark_handled() }),
  );
  await slide();
  expect(
    screen.getByText(m.admin_overview_comments_more({ count: 3 })),
  ).toBeDefined();
});

const LINK = {
  id: 9,
  siteName: "Sure Blog",
  siteUrl: "https://sure.example/blog",
  logoUrl: null,
  createdAt: new Date(0),
};

it("approves and rejects a Friend Link in place, by its name", async () => {
  calls.approve.mockResolvedValue({});
  calls.reject.mockResolvedValue({});
  wrap(
    createElement(OverviewFriendLinks, {
      pending: {
        items: [LINK, { ...LINK, id: 10, siteName: "Other" }],
        remainingCount: 0,
      },
    }),
  );
  expect(screen.getAllByText("sure.example")).toHaveLength(2);
  fireEvent.click(
    screen.getByRole("button", {
      name: m.admin_overview_link_approve({ name: "Sure Blog" }),
    }),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: m.admin_overview_link_reject({ name: "Other" }),
    }),
  );
  await slide();
  expect(calls.approve).toHaveBeenCalledWith({ id: 9 });
  expect(calls.reject).toHaveBeenCalledWith({ id: 10 });
  expect(screen.getByText(m.admin_overview_links_done())).toBeDefined();
});

it("brings a Friend Link back when its review fails, says so and reloads the overview", async () => {
  calls.approve.mockRejectedValue(new Error("offline"));
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(OverviewFriendLinks, {
        pending: { items: [LINK], remainingCount: 0 },
      }),
    ),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: m.admin_overview_link_approve({ name: "Sure Blog" }),
    }),
  );
  await slide();
  expect(rows()).toEqual([{ text: "Sure Blog", leaving: false }]);
  expect(toasts.error).toHaveBeenCalledWith(m.admin_overview_link_failed());
  expect(invalidate).toHaveBeenCalledWith({ queryKey: expect.anything() });
});

it("shows a handled Comment again, and counts it again, once an undo brings it back", async () => {
  calls.markHandled.mockResolvedValue({});
  const both = [comment({ id: 1 }), comment({ id: 2, userName: "Other" })];
  const view = wrap(
    createElement(OverviewComments, { comments: both, total: 2 }),
  );
  fireEvent.click(
    screen.getAllByRole("button", {
      name: m.dashboard_comment_mark_handled(),
    })[0]!,
  );
  await slide();
  // The handled Comment leaves the data, as the hook's optimistic update does.
  view.rerender(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(OverviewComments, { comments: [both[1]!], total: 1 }),
    ),
  );
  expect(rows().map((row) => row.text)).toEqual(["Other"]);
  // Undo: the Comment is back in the data.
  view.rerender(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(OverviewComments, { comments: both, total: 2 }),
    ),
  );
  expect(rows()).toEqual([
    { text: "Reader", leaving: false },
    { text: "Other", leaving: false },
  ]);
  expect(document.querySelector(".overview-count")?.textContent).toBe("2");
});

it("leaves the Friend Links card out while none wait", () => {
  wrap(
    createElement(OverviewFriendLinks, {
      pending: { items: [], remainingCount: 0 },
    }),
  );
  expect(screen.queryByText(m.admin_overview_links_title())).toBeNull();
});
