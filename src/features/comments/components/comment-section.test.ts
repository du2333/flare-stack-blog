// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createElement, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { RootCommentWithReplyCount } from "../comments.schema";
import type { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { CommentSection } from "./comment-section";

type Client = typeof orpcClient;
const boundary = vi.hoisted(() => ({
  client: {
    comments: {
      roots: vi.fn<Client["comments"]["roots"]>(),
      replies: vi.fn<Client["comments"]["replies"]>(),
      thread: vi.fn<Client["comments"]["thread"]>(),
      create: vi.fn<Client["comments"]["create"]>(),
      moment: {
        roots: vi.fn<Client["comments"]["moment"]["roots"]>(),
        replies: vi.fn<Client["comments"]["moment"]["replies"]>(),
        thread: vi.fn<Client["comments"]["moment"]["thread"]>(),
        create: vi.fn<Client["comments"]["moment"]["create"]>(),
      },
      remove: vi.fn<Client["comments"]["remove"]>(),
      mine: vi.fn<Client["comments"]["mine"]>(),
      admin: {
        markHandled: vi.fn<Client["comments"]["admin"]["markHandled"]>(),
        unmarkHandled: vi.fn<Client["comments"]["admin"]["unmarkHandled"]>(),
        markAllHandled: vi.fn<Client["comments"]["admin"]["markAllHandled"]>(),
      },
    },
    mutedUsers: {
      list: vi.fn<Client["mutedUsers"]["list"]>(),
      mute: vi.fn<Client["mutedUsers"]["mute"]>(),
      unmute: vi.fn<Client["mutedUsers"]["unmute"]>(),
    },
  } satisfies Pick<Client, "comments" | "mutedUsers">,
  session: {
    user: { id: "reader", name: "Reader", image: null, role: "user" },
  },
  listeners: new Set<() => void>(),
}));

vi.mock("@/lib/orpc", async () => {
  const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
  return {
    orpcClient: boundary.client,
    orpc: createTanstackQueryUtils(boundary.client),
  };
});
vi.mock("@/lib/auth/auth-client", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useSession: () => ({
      data: useSyncExternalStore(
        (notify) => {
          boundary.listeners.add(notify);
          return () => boundary.listeners.delete(notify);
        },
        () => boundary.session,
      ),
    }),
  };
});

function comment(id: number, name: string, rootId: number | null = null) {
  return {
    id,
    postId: 1,
    momentId: null,
    content: `${name}'s comment`,
    userId: name.toLowerCase(),
    status: "published" as const,
    rootId,
    replyToCommentId: rootId,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    user: {
      id: name.toLowerCase(),
      name,
      image: null,
      role: "user",
      mutedAt: null,
    },
  };
}
const thread: RootCommentWithReplyCount = {
  ...comment(100, "Author"),
  replyCount: 2,
  replies: [
    { ...comment(101, "Alice", 100), replyTo: null },
    { ...comment(102, "Bob", 100), replyTo: null },
  ],
};
let queryClient: QueryClient;
const challenges = new Map<
  string,
  { container: HTMLElement; verify: () => void }
>();
let maxChallenges = 0;
let nextChallenge = 0;
const resetChallenge = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  boundary.session = {
    user: { id: "reader", name: "Reader", image: null, role: "user" },
  };
  boundary.client.comments.roots.mockResolvedValue({
    items: [thread],
    total: 3,
    viewerMuted: false,
  });
  boundary.client.comments.replies.mockResolvedValue({
    items: thread.replies,
    total: 2,
  });
  boundary.client.comments.thread.mockResolvedValue(thread);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  challenges.clear();
  maxChallenges = 0;
  nextChallenge = 0;
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
  vi.stubGlobal("turnstile", {
    render(container: HTMLElement, options: Record<string, unknown>) {
      const id = `challenge-${++nextChallenge}`;
      challenges.set(id, {
        container,
        verify: () =>
          (options.callback as (token: string) => void)(`token-${id}`),
      });
      maxChallenges = Math.max(maxChallenges, challenges.size);
      return id;
    },
    remove: (id: string) => challenges.delete(id),
    reset: resetChallenge,
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  HTMLElement.prototype.scrollIntoView = vi.fn();
  const style = document.createElement("style");
  style.dataset.commentTest = "true";
  style.textContent = ".comment-body-text { line-height: 20px; }";
  document.head.appendChild(style);
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  document.querySelector("style[data-comment-test]")?.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function mountSection() {
  let changePost!: (postId: number) => void;
  function PostComments() {
    const [postId, setPostId] = useState(1);
    changePost = setPostId;
    return createElement(CommentSection, { postId });
  }
  const root = createRootRoute();
  const publicRoute = createRoute({
    getParentRoute: () => root,
    id: "_public",
  });
  const post = createRoute({
    getParentRoute: () => publicRoute,
    path: "/post/$slug",
    validateSearch: () => ({ comment: undefined as number | undefined }),
    component: PostComments,
  });
  const router = createRouter({
    routeTree: root.addChildren([publicRoute.addChildren([post])]),
    history: createMemoryHistory({ initialEntries: ["/post/example"] }),
  });
  await act(async () => {
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(RouterProvider, { router }),
      ),
    );
    await router.load();
  });
  await screen.findByText("Alice");
  return { changePost };
}

async function chooseReply(name: string) {
  const article = screen.getByText(name).closest("article")!;
  await act(async () => {
    fireEvent.click(
      within(article).getByRole("button", { name: m.comments_item_reply() }),
    );
  });
}

async function expectDraft(value: string) {
  await waitFor(() => {
    expect(screen.getByRole<HTMLTextAreaElement>("textbox").value).toBe(value);
    expect(challenges.size).toBe(1);
  });
  expect(maxChallenges).toBe(1);
  for (const inactive of document.querySelectorAll<HTMLTextAreaElement>(
    "[inert] textarea",
  )) {
    expect(inactive.disabled).toBe(true);
  }
}

it("retains separate root and same-thread reply drafts while keeping a single active challenge", async () => {
  await mountSection();
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(m.comments_start_new()),
      }),
    );
  });
  await expectDraft("");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Root draft" },
  });
  await chooseReply("Alice");
  await expectDraft("");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Alice draft" },
  });
  await chooseReply("Bob");
  await expectDraft("");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Bob draft" },
  });
  await chooseReply("Alice");
  await expectDraft("Alice draft");
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(m.comments_continue_draft()),
      }),
    );
  });
  await expectDraft("Root draft");
  await chooseReply("Bob");
  await expectDraft("Bob draft");
});

it("preserves drafts when the same User refreshes their profile and clears them when the User changes", async () => {
  await mountSection();
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(m.comments_start_new()),
      }),
    );
  });
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Private root draft" },
  });
  await chooseReply("Alice");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Private reply draft" },
  });

  await act(async () => {
    boundary.session = {
      user: { ...boundary.session.user, name: "Updated Reader" },
    };
    boundary.listeners.forEach((notify) => notify());
  });
  await expectDraft("Private reply draft");

  await act(async () => {
    boundary.session = {
      user: { ...boundary.session.user, id: "another-reader" },
    };
    boundary.listeners.forEach((notify) => notify());
  });
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(challenges.size).toBe(0);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(m.comments_start_new()),
      }),
    );
  });
  await expectDraft("");
  await chooseReply("Alice");
  await expectDraft("");
});

it("keeps a failed reply editable with its original draft and requires fresh verification", async () => {
  boundary.client.comments.create.mockRejectedValue(
    new Error("Network unavailable"),
  );
  await mountSection();
  await chooseReply("Alice");
  await expectDraft("");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "  Reply with spacing  " },
  });
  await act(async () => challenges.values().next().value!.verify());
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: m.comments_editor_submit_reply() }),
    );
  });

  expect((await screen.findByRole("alert")).textContent).toBe(
    m.comments_send_failed_keep_draft(),
  );
  await expectDraft("  Reply with spacing  ");
  expect(screen.getByRole<HTMLTextAreaElement>("textbox").disabled).toBe(false);
  expect(
    screen.getByRole<HTMLButtonElement>("button", {
      name: m.comments_editor_submit_reply(),
    }).disabled,
  ).toBe(true);
  expect(resetChallenge).toHaveBeenCalledOnce();
  expect(boundary.client.comments.create).toHaveBeenCalledExactlyOnceWith({
    postId: 1,
    content: "Reply with spacing",
    rootId: 100,
    replyToCommentId: 101,
  });
});

it("waits for refreshed comments before completing a reply and only clears the submitted target", async () => {
  await mountSection();
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(m.comments_start_new()),
      }),
    );
  });
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Retained root" },
  });
  await chooseReply("Bob");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Retained Bob reply" },
  });
  await chooseReply("Alice");
  await expectDraft("");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Posted reply" },
  });
  await act(async () => challenges.values().next().value!.verify());

  const created = {
    ...comment(103, "Reader", 100),
    content: "Posted reply",
    replyToCommentId: 101,
  };
  boundary.client.comments.create.mockResolvedValue(created);
  let finishRefresh!: (
    response: Awaited<ReturnType<Client["comments"]["roots"]>>,
  ) => void;
  boundary.client.comments.roots.mockReturnValueOnce(
    new Promise((resolve) => {
      finishRefresh = resolve;
    }),
  );
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: m.comments_editor_submit_reply() }),
    );
  });
  await waitFor(() =>
    expect(screen.getByRole<HTMLTextAreaElement>("textbox").disabled).toBe(
      true,
    ),
  );
  expect(
    screen.getByRole<HTMLButtonElement>("button", {
      name: m.comments_editor_cancel(),
    }).disabled,
  ).toBe(true);
  await chooseReply("Bob");
  await expectDraft("Posted reply");
  expect(screen.getByRole("textbox").getAttribute("aria-label")).toBe(
    m.comments_item_reply_to({ name: "Alice" }),
  );
  expect(resetChallenge).not.toHaveBeenCalled();

  await act(async () => {
    finishRefresh({
      items: [
        {
          ...thread,
          replyCount: 3,
          replies: [
            ...thread.replies,
            { ...created, replyTo: { id: "alice", name: "Alice" } },
          ],
        },
      ],
      total: 4,
      viewerMuted: false,
    });
  });
  await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
  expect(
    within(screen.getByText("Reader").closest("article")!).getByText(
      "Posted reply",
    ),
  ).toBeDefined();
  expect(document.activeElement).toBe(
    within(screen.getByText("Alice").closest("article")!).getByRole("button", {
      name: m.comments_item_reply(),
    }),
  );
  expect(challenges.size).toBe(0);
  await chooseReply("Alice");
  await expectDraft("");
  await chooseReply("Bob");
  await expectDraft("Retained Bob reply");
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(m.comments_continue_draft()),
      }),
    );
  });
  await expectDraft("Retained root");
});

it("cancels each editor without losing its draft and restores its opening button's focus", async () => {
  await mountSection();
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(m.comments_start_new()),
      }),
    );
  });
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Cancelled root" },
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: m.comments_editor_cancel() }),
    );
  });
  const rootTrigger = screen.getByRole("button", {
    name: (name) => name.endsWith(m.comments_continue_draft()),
  });
  await waitFor(() => expect(document.activeElement).toBe(rootTrigger));
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(challenges.size).toBe(0);
  await act(async () => fireEvent.click(rootTrigger));
  await expectDraft("Cancelled root");

  await chooseReply("Alice");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Cancelled reply" },
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: m.comments_editor_cancel() }),
    );
  });
  expect(document.activeElement).toBe(
    within(screen.getByText("Alice").closest("article")!).getByRole("button", {
      name: m.comments_item_reply(),
    }),
  );
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(challenges.size).toBe(0);
  await chooseReply("Alice");
  await expectDraft("Cancelled reply");
});

it("clears both root and reply drafts when showing another Post", async () => {
  const section = await mountSection();
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(m.comments_start_new()),
      }),
    );
  });
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Previous Post root" },
  });
  await chooseReply("Alice");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Previous Post reply" },
  });
  boundary.client.comments.roots.mockResolvedValue({
    items: [],
    total: 0,
    viewerMuted: false,
  });
  await act(async () => section.changePost(2));
  await screen.findByText(m.comments_list_empty());
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(challenges.size).toBe(0);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(m.comments_start_new()),
      }),
    );
  });
  await expectDraft("");

  boundary.client.comments.roots.mockResolvedValue({
    items: [thread],
    total: 3,
    viewerMuted: false,
  });
  await act(async () => section.changePost(1));
  await screen.findByText("Alice");
  expect(screen.queryByRole("textbox")).toBeNull();
  await chooseReply("Alice");
  await expectDraft("");
});
