// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { DashboardComment } from "@/features/dashboard/dashboard.schema";
import { m } from "@/paraglide/messages";
import { UnrepliedCommentList } from "./unreplied-comment-list";

vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
  useNavigate: () => vi.fn(),
  // The address a link names is the router's to build; its test is in moment-route.test.ts.
  Link: ({
    to,
    params,
    search,
    children,
    ...rest
  }: {
    to: string;
    params: Record<string, string>;
    search?: Record<string, unknown>;
    children: ReactNode;
  }) => {
    const path = to.replace(/\$(\w+)/g, (_, key: string) => params[key]);
    const query = new URLSearchParams(
      Object.entries(search ?? {}).map(([key, value]) => [key, String(value)]),
    );
    return createElement(
      "a",
      { ...rest, href: query.size ? `${path}?${query}` : path },
      children,
    );
  },
}));
vi.mock("@/lib/auth/auth-client", () => ({
  useSession: () => ({ data: { user: { id: "admin", role: "admin" } } }),
}));
vi.mock("@/components/common/turnstile", () => ({
  Turnstile: () => null,
  useTurnstile: () => ({
    isPending: false,
    reset: vi.fn(),
    turnstileProps: {},
  }),
}));
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMediaQuery: () => false,
}));

function queued(change: Partial<DashboardComment>): DashboardComment {
  return {
    id: 1,
    postId: null,
    momentId: null,
    rootId: null,
    userId: "reader",
    userName: "Reader",
    userImage: null,
    userMuted: false,
    postTitle: null,
    postSlug: null,
    momentTitle: null,
    commentPath: "/",
    snippet: "A comment",
    createdAt: new Date(0),
    ...change,
  };
}

function renderList(comments: Array<DashboardComment>) {
  render(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(UnrepliedCommentList, {
        comments,
        onMarkHandled: vi.fn(),
        fallbackFocus: () => null,
      }),
    ),
  );
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("names the Moment a Comment is on, marks it as a Moment and links to the Comment", () => {
  renderList([
    queued({
      id: 33,
      momentId: 9,
      momentTitle: "First words of the Moment",
      commentPath: "/moments/9?comment=33",
    }),
  ]);

  const row = screen.getByRole("link");
  expect(row.getAttribute("href")).toBe("/moments/9?comment=33");
  expect(within(row).getByText("First words of the Moment")).toBeTruthy();
  expect(
    within(row).getByText(m.dashboard_comment_source_moment()),
  ).toBeTruthy();
});

it("shows a Post's Comment as before, without the Moment mark", () => {
  renderList([
    queued({
      id: 5,
      postId: 2,
      postTitle: "A Post",
      postSlug: "a-post",
      commentPath: "/post/a-post?comment=5",
    }),
  ]);

  const row = screen.getByRole("link");
  expect(row.getAttribute("href")).toBe("/post/a-post?comment=5");
  expect(within(row).getByText("A Post")).toBeTruthy();
  expect(
    within(row).queryByText(m.dashboard_comment_source_moment()),
  ).toBeNull();
});
