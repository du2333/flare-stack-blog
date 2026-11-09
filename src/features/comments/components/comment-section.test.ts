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
  toastError: vi.fn(),
}));

vi.mock("sonner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sonner")>()),
  toast: Object.assign(vi.fn(), {
    error: boundary.toastError,
    loading: vi.fn(),
    dismiss: vi.fn(),
    success: vi.fn(),
  }),
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

async function mountSection({
  type = "post",
  search = "",
  ready = "Alice",
}: {
  type?: "post" | "moment";
  search?: string;
  /** The text that shows the section has loaded. */
  ready?: string;
} = {}) {
  let changePost!: (id: number) => void;
  function PageComments() {
    const [id, setId] = useState(1);
    changePost = setId;
    return createElement(CommentSection, { target: { type, id } });
  }
  const root = createRootRoute();
  const publicRoute = createRoute({
    getParentRoute: () => root,
    id: "_public",
  });
  const page = createRoute({
    getParentRoute: () => publicRoute,
    path: type === "post" ? "/post/$slug" : "/moments/$id",
    validateSearch: (search: Record<string, unknown>) => ({
      comment: search.comment == null ? undefined : Number(search.comment),
    }),
    component: PageComments,
  });
  const router = createRouter({
    routeTree: root.addChildren([publicRoute.addChildren([page])]),
    history: createMemoryHistory({
      initialEntries: [
        `${type === "post" ? "/post/example" : "/moments/1"}${search}`,
      ],
    }),
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
  await screen.findByText(ready);
  return { changePost, router };
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

function onMoment<T extends { postId: number | null; momentId: number | null }>(
  value: T,
): T {
  return { ...value, postId: null, momentId: 1 };
}
const momentThread: RootCommentWithReplyCount = {
  ...onMoment(thread),
  replies: thread.replies.map(onMoment),
};

function momentSection(search = "") {
  boundary.client.comments.moment.roots.mockResolvedValue({
    items: [momentThread],
    total: 3,
    viewerMuted: false,
  });
  boundary.client.comments.moment.thread.mockResolvedValue(momentThread);
  return mountSection({ type: "moment", search });
}

it("reads a Moment's Comments through the Moment procedures and leaves the Post ones alone", async () => {
  await momentSection();
  expect(boundary.client.comments.moment.roots).toHaveBeenCalledWith(
    { momentId: 1, offset: 0, limit: expect.any(Number) },
    expect.anything(),
  );
  expect(screen.getByText("Author's comment")).toBeDefined();
  expect(screen.getByText("Bob's comment")).toBeDefined();
  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
    `${m.comments_heading()} 3`,
  );
  expect(boundary.client.comments.roots).not.toHaveBeenCalled();
});

it("shows the empty state for a Moment nobody has commented on", async () => {
  boundary.client.comments.moment.roots.mockResolvedValue({
    items: [],
    total: 0,
    viewerMuted: false,
  });
  await mountSection({ type: "moment", ready: m.comments_list_empty() });
  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
    `${m.comments_heading()} 0`,
  );
});

it("posts a reply on a Moment under its momentId, then refreshes the Moment's reads and its comment count", async () => {
  await momentSection();
  queryClient.setQueryData(["moments", "detail", 1], { id: 1 });
  await chooseReply("Alice");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Reply on a Moment" },
  });
  await act(async () => challenges.values().next().value!.verify());
  boundary.client.comments.moment.create.mockResolvedValue({
    ...onMoment(comment(103, "Reader", 100)),
    content: "Reply on a Moment",
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: m.comments_editor_submit_reply() }),
    );
  });
  await waitFor(() =>
    expect(boundary.client.comments.moment.create).toHaveBeenCalledWith({
      momentId: 1,
      content: "Reply on a Moment",
      rootId: 100,
      replyToCommentId: 101,
    }),
  );
  expect(boundary.client.comments.create).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(boundary.client.comments.moment.roots).toHaveBeenCalledTimes(2),
  );
  expect(
    queryClient.getQueryState(["moments", "detail", 1])?.isInvalidated,
  ).toBe(true);
});

it("jumps to the thread a ?comment= link names on a Moment's page", async () => {
  boundary.client.comments.moment.roots.mockResolvedValue({
    items: [],
    total: 1,
    viewerMuted: false,
  });
  boundary.client.comments.moment.thread.mockResolvedValue({
    ...momentThread,
    replies: [],
    replyCount: 1,
  });
  boundary.client.comments.moment.replies.mockResolvedValue({
    items: momentThread.replies.slice(0, 1),
    total: 1,
  });
  const scroll = vi.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  await mountSection({
    type: "moment",
    search: "?comment=101",
    ready: "Alice's comment",
  });
  expect(boundary.client.comments.moment.thread).toHaveBeenCalledWith(
    { momentId: 1, id: 101 },
    expect.anything(),
  );
  expect(boundary.client.comments.thread).not.toHaveBeenCalled();
  const target = screen.getByText("Alice's comment").closest("article")!;
  expect(target.id).toBe("comment-101");
  expect(target.className).toContain("comment-highlighted");
  await waitFor(() => expect(scroll).toHaveBeenCalled());
});

it("shows a deleted Comment on a Moment as a placeholder, and a muted User's notice in place of the composer", async () => {
  boundary.client.comments.moment.roots.mockResolvedValue({
    items: [
      {
        ...momentThread,
        replies: [
          { ...momentThread.replies[0], status: "deleted", replyTo: null },
          momentThread.replies[1],
        ],
      },
    ],
    total: 2,
    viewerMuted: true,
  });
  await mountSection({ type: "moment", ready: "Bob's comment" });
  expect(screen.getByText(m.comments_item_deleted_content())).toBeDefined();
  expect(screen.getByText(m.comments_muted_message())).toBeDefined();
  expect(
    screen.queryByRole("button", {
      name: (name) => name.endsWith(m.comments_start_new()),
    }),
  ).toBeNull();
});

it("sends a signed-out reader to sign in from a Moment's page and back to its comments", async () => {
  boundary.session = undefined as never;
  await momentSection("?comment=100");
  const link = screen.getByRole("link", { name: /./ });
  const href = decodeURIComponent(link.getAttribute("href") ?? "");
  expect(href).toContain("/moments/1");
  expect(href).toContain("#comments");
});

it("lets an Admin mute a Moment's commenter from the comment and refreshes the Moment's reads", async () => {
  boundary.session = {
    user: { id: "admin", name: "Admin", image: null, role: "admin" },
  };
  boundary.client.mutedUsers.mute.mockResolvedValue(undefined as never);
  await momentSection();
  const article = screen.getByText("Alice's comment").closest("article")!;
  await act(async () => {
    fireEvent.click(
      within(article).getByRole("button", { name: m.comments_more_actions() }),
    );
  });
  await act(async () => {
    fireEvent.click(
      await screen.findByRole("menuitem", { name: m.comments_item_mute() }),
    );
  });
  await act(async () => {
    fireEvent.click(
      await screen.findByRole("button", { name: m.comments_mute_confirm() }),
    );
  });
  await waitFor(() =>
    expect(boundary.client.mutedUsers.mute).toHaveBeenCalledWith({
      userId: "alice",
    }),
  );
  await waitFor(() =>
    expect(boundary.client.comments.moment.roots).toHaveBeenCalledTimes(2),
  );
  expect(boundary.client.comments.roots).not.toHaveBeenCalled();
});

it("offers an Admin only mute on a deleted placeholder, never delete, on a Post and on a Moment", async () => {
  boundary.session = {
    user: { id: "admin", name: "Admin", image: null, role: "admin" },
  };
  const withDeleted = (source: RootCommentWithReplyCount) => ({
    ...source,
    replies: [
      { ...source.replies[0], status: "deleted" as const },
      source.replies[1],
    ],
  });
  boundary.client.comments.roots.mockResolvedValue({
    items: [withDeleted(thread)],
    total: 2,
    viewerMuted: false,
  });
  boundary.client.comments.moment.roots.mockResolvedValue({
    items: [withDeleted(momentThread)],
    total: 2,
    viewerMuted: false,
  });
  for (const type of ["post", "moment"] as const) {
    await mountSection({ type, ready: "Bob's comment" });
    const placeholder = screen
      .getByText(m.comments_item_deleted_content())
      .closest("article")!;
    await act(async () => {
      fireEvent.click(
        within(placeholder).getByRole("button", {
          name: m.comments_more_actions(),
        }),
      );
    });
    const items = (await screen.findAllByRole("menuitem")).map(
      (item) => item.textContent,
    );
    expect(items).toEqual([m.comments_item_mute()]);
    cleanup();
  }
});

it("reports a ?comment= link that names no comment as soon as the 404 arrives, without retrying", async () => {
  const { ORPCError } = await import("@orpc/client");
  const notFound = new ORPCError("COMMENT_NOT_FOUND", { status: 404 });
  boundary.client.comments.thread.mockRejectedValue(notFound);
  boundary.client.comments.moment.thread.mockRejectedValue(notFound);
  boundary.client.comments.moment.roots.mockResolvedValue({
    items: [momentThread],
    total: 3,
    viewerMuted: false,
  });
  // The app's own client retries failures; only a 404 may skip that.
  queryClient = new QueryClient();
  for (const type of ["post", "moment"] as const) {
    boundary.toastError.mockClear();
    await mountSection({ type, search: "?comment=999" });
    await waitFor(() =>
      expect(boundary.toastError).toHaveBeenCalledWith(
        m.comments_locate_failed(),
      ),
    );
    const called =
      type === "post"
        ? boundary.client.comments.thread
        : boundary.client.comments.moment.thread;
    expect(called).toHaveBeenCalledTimes(1);
    cleanup();
  }
});
