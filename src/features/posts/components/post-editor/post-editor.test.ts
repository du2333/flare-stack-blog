// @vitest-environment jsdom
import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import { createElement, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "@/lib/toast";
import { findInPopover } from "tests/popover";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminChromeProvider } from "@/components/admin/admin-chrome";
import { installDomShims } from "@/features/posts/editor/test-utils";
import { m } from "@/paraglide/messages";
import { PostEditor } from ".";
import type { PostEditorData, PostEditorProps, PostEditorSave } from "./types";

const publish = vi.hoisted(() => vi.fn());
const discardChanges = vi.hoisted(() => vi.fn());

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/orpc", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/orpc")>();
  return {
    ...original,
    orpcClient: {
      posts: { admin: { publish, discardChanges } },
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: ReactNode }) =>
    createElement("a", null, children),
  useBlocker: () => ({ status: "idle", proceed: vi.fn(), reset: vi.fn() }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
}));

beforeEach(() => {
  publish.mockReset();
  discardChanges.mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

afterEach(cleanup);

const INITIAL: PostEditorProps["initialData"] = {
  id: 1,
  title: "Post",
  summary: "",
  slug: "post",
  contentJson: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "intro" }] },
      { type: "paragraph" },
    ],
  },
  publishedAt: null,
  tagIds: [],
  categoryId: null,
  hasPublicSnapshot: false,
  serverToday: "2026-10-05",
  coverMediaId: null,
  cover: null,
  saveToken: "token-1",
};

function editConflict(saveToken: string) {
  return new ORPCError("EDIT_CONFLICT", {
    status: 409,
    defined: true,
    data: { saveToken },
  });
}

/**
 * A post store that, like the server, refuses a save stating a token other
 * than the current one and replaces the token on every write.
 */
function createServer(token = "token-1") {
  let counter = 1;
  const server = {
    token,
    saved: null as PostEditorData | null,
    /** The token each save stated, and the token each one returned. */
    stated: [] as Array<string>,
    issued: [] as Array<string>,
    /** Another client's save, which replaces the token. */
    saveElsewhere() {
      counter += 1;
      server.token = `elsewhere-${counter}`;
    },
    save: (async (data, saveToken, acceptSaveToken) => {
      server.stated.push(saveToken);
      if (saveToken !== server.token) throw editConflict(server.token);
      counter += 1;
      server.token = `token-${counter}`;
      server.issued.push(server.token);
      server.saved = data;
      acceptSaveToken(server.token);
    }) as PostEditorSave,
  };
  return server;
}

/**
 * Stands in for the route, which mounts the editor afresh with the post as
 * stored once `onReload` resolves.
 */
function Host({
  onSave,
  stored,
  unpublishedChanges,
}: {
  onSave: PostEditorSave;
  stored: () => PostEditorProps["initialData"];
  unpublishedChanges: () => boolean;
}) {
  const [mounts, setMounts] = useState(0);
  return createElement(PostEditor, {
    key: mounts,
    initialData: stored(),
    publicSlug: null,
    hasUnpublishedChanges: unpublishedChanges(),
    onSave,
    onReload: async () => setMounts((count) => count + 1),
  });
}

async function renderPostEditorPage(
  onSave: PostEditorSave,
  stored: () => PostEditorProps["initialData"] = () => INITIAL,
  unpublishedChanges: () => boolean = () => false,
) {
  installDomShims();
  render(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
      createElement(
        AdminChromeProvider,
        null,
        createElement(Host, { onSave, stored, unpublishedChanges }),
      ),
    ),
  );
  return currentEditor();
}

function currentEditor() {
  return waitFor(() => {
    const dom = document.querySelector<HTMLElement & { editor?: Editor }>(
      ".ProseMirror",
    );
    if (!dom?.editor) throw new Error("The editor was not created");
    return dom.editor;
  });
}

function typeInto(editor: Editor, text: string) {
  act(() => {
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.commands.insertContent(text);
  });
}

const AUTOSAVE_WAIT = { timeout: 4000 };

it("saves the post without an unfilled image placeholder", async () => {
  const onSave = vi.fn<PostEditorSave>(async () => {});
  const editor = await renderPostEditorPage(onSave);

  act(() => {
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.commands.insertImagePlaceholder();
  });
  expect(JSON.stringify(editor.getJSON())).toContain("imagePlaceholder");

  await waitFor(() => expect(onSave).toHaveBeenCalled(), AUTOSAVE_WAIT);
  const saved = onSave.mock.lastCall?.[0].contentJson;
  expect(JSON.stringify(saved)).not.toContain("imagePlaceholder");
  expect(saved?.content?.[0]).toEqual(INITIAL.contentJson?.content?.[0]);
});

it("states the token it read and the one each save returned", async () => {
  const server = createServer();
  const editor = await renderPostEditorPage(server.save);

  typeInto(editor, "one");
  await waitFor(() => expect(server.stated).toHaveLength(1), AUTOSAVE_WAIT);
  typeInto(editor, "two");
  await waitFor(() => expect(server.stated).toHaveLength(2), AUTOSAVE_WAIT);

  expect(server.stated).toEqual(["token-1", server.issued[0]]);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("stops autosaving and says so when the post was saved elsewhere", async () => {
  const server = createServer();
  const save = vi.fn(server.save);
  const editor = await renderPostEditorPage(save);

  server.saveElsewhere();
  typeInto(editor, "mine");

  const notice = await screen.findByRole("alert", {}, AUTOSAVE_WAIT);
  expect(notice.textContent).toContain(m.editor_conflict_title());
  expect(notice.textContent).toContain(m.editor_conflict_desc());
  expect(save).toHaveBeenCalledTimes(1);

  typeInto(editor, " more");
  await new Promise((resolve) => setTimeout(resolve, 2200));
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toBe(notice);
});

it("overwrites with the token from the 409 and resumes autosaving", async () => {
  const server = createServer();
  const save = vi.fn(server.save);
  const editor = await renderPostEditorPage(save);

  server.saveElsewhere();
  const elsewhere = server.token;
  typeInto(editor, "mine");
  await screen.findByRole("alert", {}, AUTOSAVE_WAIT);

  fireEvent.click(
    screen.getByRole("button", { name: m.editor_conflict_overwrite() }),
  );

  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1]?.[1]).toBe(elsewhere);
  expect(JSON.stringify(server.saved?.contentJson)).toContain("mine");
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());

  typeInto(editor, " again");
  await waitFor(() => expect(save).toHaveBeenCalledTimes(3), AUTOSAVE_WAIT);
  expect(save.mock.calls[2]?.[1]).toBe(server.issued[0]);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows the notice again when the overwrite is refused too", async () => {
  const server = createServer();
  const save = vi.fn(server.save);
  const editor = await renderPostEditorPage(save);

  server.saveElsewhere();
  typeInto(editor, "mine");
  await screen.findByRole("alert", {}, AUTOSAVE_WAIT);

  server.saveElsewhere();
  fireEvent.click(
    screen.getByRole("button", { name: m.editor_conflict_overwrite() }),
  );

  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  await screen.findByRole("alert");
  expect(server.saved).toBeNull();
});

it("loads the latest version, drops local edits and resumes autosaving", async () => {
  const server = createServer();
  const save = vi.fn(server.save);
  let stored: PostEditorProps["initialData"] = INITIAL;
  const editor = await renderPostEditorPage(save, () => stored);

  server.saveElsewhere();
  stored = {
    ...INITIAL,
    title: "Edited elsewhere",
    saveToken: server.token,
    contentJson: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "theirs" }] },
      ],
    },
  };
  typeInto(editor, "mine");
  await screen.findByRole("alert", {}, AUTOSAVE_WAIT);

  fireEvent.click(
    screen.getByRole("button", { name: m.editor_conflict_load_latest() }),
  );

  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  const reloaded = await waitFor(async () => {
    const next = await currentEditor();
    expect(next.getText()).toContain("theirs");
    return next;
  });
  expect(reloaded.getText()).not.toContain("mine");
  expect(save).toHaveBeenCalledTimes(1);

  typeInto(reloaded, " next");
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2), AUTOSAVE_WAIT);
  expect(save.mock.calls[1]?.[1]).toBe(stored.saveToken);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("publishes with the current token and keeps the one it returns", async () => {
  const server = createServer();
  const save = vi.fn(server.save);
  const editor = await renderPostEditorPage(save);
  publish.mockResolvedValue({ success: true, saveToken: "published-1" });

  typeInto(editor, "draft");
  fireEvent.click(
    screen.getAllByRole("button", { name: m.editor_header_publish() })[0]!,
  );
  await waitFor(() => expect(publish).toHaveBeenCalled(), AUTOSAVE_WAIT);
  expect(publish).toHaveBeenCalledWith({
    id: 1,
    saveToken: server.issued[0],
  });

  server.token = "published-1";
  typeInto(editor, " after");
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2), AUTOSAVE_WAIT);
  expect(save.mock.calls[1]?.[1]).toBe("published-1");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("surfaces the conflict when publishing is refused", async () => {
  const server = createServer();
  await renderPostEditorPage(server.save);
  publish.mockRejectedValue(editConflict("elsewhere-1"));

  fireEvent.click(
    screen.getAllByRole("button", { name: m.editor_header_publish() })[0]!,
  );

  await screen.findByRole("alert", {}, AUTOSAVE_WAIT);
  for (const button of screen.getAllByRole("button", {
    name: m.editor_header_publish(),
  })) {
    expect((button as HTMLButtonElement).disabled).toBe(true);
  }
});

it("tells the Admin to change a publication date that is in the future", async () => {
  await renderPostEditorPage(createServer().save);
  publish.mockRejectedValue(
    new ORPCError("PUBLISHED_AT_IN_FUTURE", { status: 400, defined: true }),
  );

  fireEvent.click(
    screen.getAllByRole("button", { name: m.editor_header_publish() })[0]!,
  );

  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      m.editor_action_publish_future_date(),
    ),
  );
});

function tooLarge(field: "contentJson" | "publicSnapshot") {
  return new ORPCError("POST_CONTENT_TOO_LARGE", {
    status: 413,
    defined: true,
    data: { field, limit: 800_000, size: 900_000 },
  });
}

it("says the post is too large to save instead of a generic failure", async () => {
  const save = vi.fn<PostEditorSave>(async () => {
    throw tooLarge("contentJson");
  });
  const editor = await renderPostEditorPage(save);

  typeInto(editor, "more");

  await waitFor(
    () =>
      expect(toast.error).toHaveBeenCalledWith(
        m.editor_content_too_large({ limit: 800 }),
      ),
    AUTOSAVE_WAIT,
  );
  expect(m.editor_content_too_large({ limit: 800 })).toContain("800");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("says the published version is too large when publishing is refused for it", async () => {
  await renderPostEditorPage(createServer().save);
  publish.mockRejectedValue(tooLarge("publicSnapshot"));

  fireEvent.click(
    screen.getAllByRole("button", { name: m.editor_header_publish() })[0]!,
  );

  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      m.editor_snapshot_too_large({ limit: 800 }),
    ),
  );
  expect(toast.error).not.toHaveBeenCalledWith(
    m.editor_action_publish_failed(),
  );
});

it("keeps autosaving and holds back publishing while the slug is taken", async () => {
  const server = createServer();
  const save = vi.fn<PostEditorSave>(async (...args) => {
    await server.save(...args);
    return { slugTaken: true };
  });
  const editor = await renderPostEditorPage(save);

  typeInto(editor, "one");
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1), AUTOSAVE_WAIT);
  fireEvent.click(
    screen.getAllByRole("button", { name: m.editor_info_title() })[0]!,
  );
  expect(await screen.findByText(m.editor_meta_slug_taken())).toBeTruthy();
  await waitFor(() => expect(publishButton().disabled).toBe(true));

  typeInto(editor, " two");
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2), AUTOSAVE_WAIT);
  expect(screen.getByText(m.editor_meta_slug_taken())).toBeTruthy();
  expect(headerStatus()).not.toBe(m.editor_status_save_error());
});

const PUBLISHED: PostEditorProps["initialData"] = {
  ...INITIAL,
  hasPublicSnapshot: true,
};

function headerStatus() {
  return screen.getByRole("status").textContent;
}

function publishButton() {
  return screen.getAllByRole("button", {
    name: new RegExp(
      `^(${[
        m.editor_header_publish(),
        m.editor_header_publish_changes(),
        m.editor_header_republish(),
      ].join("|")})$`,
    ),
  })[0] as HTMLButtonElement;
}

async function chooseFromMoreMenu(name: string) {
  fireEvent.click(
    screen.getByRole("button", { name: m.editor_more_actions() }),
  );
  fireEvent.click(await findInPopover("menuitem", { name }));
}

it("names the draft state and offers to publish it", async () => {
  await renderPostEditorPage(createServer().save);

  expect(screen.getByText(m.admin_posts_status_draft())).toBeDefined();
  expect(publishButton().textContent).toBe(m.editor_header_publish());
  fireEvent.click(
    screen.getByRole("button", { name: m.editor_more_actions() }),
  );
  await findInPopover("menuitem", { name: m.admin_posts_action_delete_post() });
  expect(
    screen.queryByRole("menuitem", { name: m.editor_header_discard() }),
  ).toBeNull();
});

it("names a published post with unpublished changes and offers to publish and discard them", async () => {
  await renderPostEditorPage(
    createServer().save,
    () => PUBLISHED,
    () => true,
  );

  expect(
    screen.getByText(m.admin_posts_status_published_changed()),
  ).toBeDefined();
  expect(publishButton().textContent).toBe(m.editor_header_publish_changes());
  expect(publishButton().disabled).toBe(false);
  fireEvent.click(
    screen.getByRole("button", { name: m.editor_more_actions() }),
  );
  await findInPopover("menuitem", { name: m.editor_header_discard() });
});

it("names a published post that matches its draft and keeps republishing available", async () => {
  await renderPostEditorPage(createServer().save, () => PUBLISHED);

  expect(screen.getByText(m.admin_posts_status_published())).toBeDefined();
  expect(publishButton().textContent).toBe(m.editor_header_republish());
  expect(publishButton().disabled).toBe(false);
  fireEvent.click(
    screen.getByRole("button", { name: m.editor_more_actions() }),
  );
  await findInPopover("menuitem", { name: m.editor_header_unpublish() });
  expect(
    screen.queryByRole("menuitem", { name: m.editor_header_discard() }),
  ).toBeNull();
});

it("shows a published post as changed as soon as it is edited", async () => {
  const editor = await renderPostEditorPage(
    createServer().save,
    () => PUBLISHED,
  );

  typeInto(editor, "more");
  expect(
    screen.getByText(m.admin_posts_status_published_changed()),
  ).toBeDefined();
  expect(publishButton().textContent).toBe(m.editor_header_publish_changes());
});

it("discards with the current token, loads the restored post and takes the new token", async () => {
  const server = createServer();
  const save = vi.fn(server.save);
  let stored: PostEditorProps["initialData"] = PUBLISHED;
  let changed = true;
  const editor = await renderPostEditorPage(
    save,
    () => stored,
    () => changed,
  );
  typeInto(editor, "draft only");
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1), AUTOSAVE_WAIT);
  discardChanges.mockImplementation(async () => {
    stored = {
      ...PUBLISHED,
      title: "Published title",
      saveToken: "discarded-1",
      contentJson: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "published" }] },
        ],
      },
    };
    changed = false;
    server.token = "discarded-1";
    return { success: true, saveToken: "discarded-1" };
  });

  await chooseFromMoreMenu(m.editor_header_discard());
  const dialog = await screen.findByRole("dialog", {
    name: m.editor_discard_confirm_title(),
  });
  expect(discardChanges).not.toHaveBeenCalled();
  fireEvent.click(
    within(dialog).getByRole("button", { name: m.editor_header_discard() }),
  );

  await waitFor(() => expect(discardChanges).toHaveBeenCalled());
  expect(discardChanges).toHaveBeenCalledWith({
    id: 1,
    saveToken: server.issued[0],
  });
  const reloaded = await waitFor(async () => {
    const next = await currentEditor();
    expect(next.getText()).toContain("published");
    return next;
  });
  expect(reloaded.getText()).not.toContain("draft only");
  expect(toast.success).toHaveBeenCalledWith(m.editor_discard_toast_done());
  expect(screen.getByText(m.admin_posts_status_published())).toBeDefined();
  expect(screen.queryByRole("alert")).toBeNull();

  typeInto(reloaded, " next");
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2), AUTOSAVE_WAIT);
  expect(save.mock.calls[1]?.[1]).toBe("discarded-1");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows the conflict notice when discarding is refused over the token", async () => {
  await renderPostEditorPage(
    createServer().save,
    () => PUBLISHED,
    () => true,
  );
  discardChanges.mockRejectedValue(editConflict("elsewhere-1"));

  await chooseFromMoreMenu(m.editor_header_discard());
  const dialog = await screen.findByRole("dialog", {
    name: m.editor_discard_confirm_title(),
  });
  fireEvent.click(
    within(dialog).getByRole("button", { name: m.editor_header_discard() }),
  );

  const notice = await screen.findByRole("alert", {}, AUTOSAVE_WAIT);
  expect(notice.textContent).toContain(m.editor_conflict_title());
  expect(toast.error).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});

it("reports any other discard failure as a message and leaves the editor as it was", async () => {
  await renderPostEditorPage(
    createServer().save,
    () => PUBLISHED,
    () => true,
  );
  discardChanges.mockRejectedValue(
    new ORPCError("NO_UNPUBLISHED_CHANGES", { status: 409, defined: true }),
  );

  await chooseFromMoreMenu(m.editor_header_discard());
  const dialog = await screen.findByRole("dialog", {
    name: m.editor_discard_confirm_title(),
  });
  fireEvent.click(
    within(dialog).getByRole("button", { name: m.editor_header_discard() }),
  );

  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      m.editor_action_discard_no_changes(),
    ),
  );
  expect(screen.queryByRole("alert")).toBeNull();
});

it("says autosave is paused, not that saving failed, during an Edit Conflict", async () => {
  const server = createServer();
  const editor = await renderPostEditorPage(server.save);

  server.saveElsewhere();
  typeInto(editor, "mine");
  await screen.findByRole("alert", {}, AUTOSAVE_WAIT);

  expect(headerStatus()).toBe(m.editor_status_paused());
  expect(screen.queryByText(m.editor_status_save_error())).toBeNull();
});

it("says the draft is saved, not that it is live, when nothing is waiting", async () => {
  await renderPostEditorPage(createServer().save, () => PUBLISHED);

  expect(headerStatus()).toBe(m.editor_status_draft_saved());
});

/** The status the header shows once the rest was saved without the link. */
function savedExceptLink() {
  const time = /\d{2}:\d{2}/.exec(headerStatus() ?? "")?.[0] ?? "";
  return m.editor_status_saved_except_link({ time });
}

/** Opens the info panel and types `slug` into the link field. */
function typeSlug(slug: string) {
  fireEvent.click(
    screen.getAllByRole("button", { name: m.editor_info_title() })[0]!,
  );
  fireEvent.change(screen.getByPlaceholderText("your-post-slug"), {
    target: { value: slug },
  });
}

it.each([
  ["has a forbidden character", "a/b", m.editor_meta_slug_invalid()],
  ["is reserved", "pinned", m.editor_meta_slug_reserved()],
])(
  "shows saving only while a request is out when the slug %s, then saved",
  async (_case, slug, hint) => {
    const server = createServer();
    let finish!: () => void;
    const save = vi.fn<PostEditorSave>(async (...args) => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      await server.save(...args);
    });
    await renderPostEditorPage(save);

    typeSlug(slug);
    expect(screen.getByText(hint)).toBeTruthy();
    // Nothing is out yet, so the header does not claim to be saving.
    expect(headerStatus()).toBe(m.editor_status_unsaved());

    await waitFor(
      () => expect(headerStatus()).toBe(m.editor_status_saving()),
      AUTOSAVE_WAIT,
    );
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    // The header says the link is the part that was not saved.
    await waitFor(() => expect(headerStatus()).toBe(savedExceptLink()));
    // The rest of the post was saved; the field keeps saying the link was not.
    expect(screen.getByText(hint)).toBeTruthy();
    // Nothing else waits, so no further request is sent.
    await new Promise((resolve) => setTimeout(resolve, 1800));
    expect(save).toHaveBeenCalledTimes(1);
    expect(headerStatus()).not.toBe(m.editor_status_saving());
  },
);

it("shows saved, not saving, once the rest of the post was saved without a taken slug", async () => {
  const server = createServer();
  const save = vi.fn<PostEditorSave>(async (...args) => {
    await server.save(...args);
    return { slugTaken: true };
  });
  await renderPostEditorPage(save);

  typeSlug("taken-slug");
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1), AUTOSAVE_WAIT);
  await waitFor(() => expect(headerStatus()).toBe(savedExceptLink()));
  expect(screen.getByText(m.editor_meta_slug_taken())).toBeTruthy();
  await new Promise((resolve) => setTimeout(resolve, 1800));
  expect(save).toHaveBeenCalledTimes(1);
});
