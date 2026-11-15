// @vitest-environment jsdom
import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { toast } from "@/lib/toast";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminChromeProvider } from "@/components/admin/admin-chrome";
import { m } from "@/paraglide/messages";
import { PostHistoryPage } from "./post-history-page";

const api = vi.hoisted(() => ({
  getPost: vi.fn(),
  revisionList: vi.fn(),
  revisionGet: vi.fn(),
  restore: vi.fn(),
  remove: vi.fn(),
}));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/orpc", async () => {
  const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
  // Only the paths a restore invalidates need to exist, for their keys.
  const orpcClient = {
    tags: {
      list: vi.fn(),
      admin: { list: vi.fn(), byPostId: vi.fn().mockResolvedValue([]) },
    },
    categories: { list: vi.fn() },
    media: { linkedKeys: vi.fn() },
    posts: {
      list: vi.fn(),
      admin: {
        list: vi.fn(),
        get: api.getPost,
        revisions: {
          list: api.revisionList,
          get: api.revisionGet,
          restore: api.restore,
          remove: api.remove,
        },
      },
    },
  };
  return { orpcClient, orpc: createTanstackQueryUtils(orpcClient) };
});

vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
  Link: ({ children }: { children: ReactNode }) =>
    createElement("a", null, children),
  useNavigate: () => navigate,
}));

vi.mock("@/features/posts/components/post-diff/post-diff", () => ({
  PostDiff: () => null,
}));
vi.mock("./post-editor-history-document", () => ({
  PostEditorHistoryDocument: () => null,
}));
vi.mock("./post-editor-history-list", () => ({
  PostEditorHistoryList: () => null,
}));

beforeEach(() => {
  api.getPost.mockReset().mockResolvedValue({ saveToken: "token-1" });
  api.revisionList.mockReset().mockResolvedValue([]);
  api.revisionGet.mockReset().mockResolvedValue({
    id: 7,
    createdAt: new Date("2026-10-29T12:00:00Z"),
    snapshotJson: { title: "Older" },
  });
  api.restore.mockReset();
  api.remove.mockReset();
  navigate.mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  // Reduced motion, so a closed confirmation closes without a delay.
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
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

function renderPage(revisionId = 7) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const page = (id: number) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        AdminChromeProvider,
        null,
        createElement(PostHistoryPage, { postId: 1, revisionId: id }),
      ),
    );
  const { rerender } = render(page(revisionId));
  // The route keeps the page mounted when another version is selected.
  return { selectVersion: (id: number) => rerender(page(id)) };
}

function editConflict(saveToken: string) {
  return new ORPCError("EDIT_CONFLICT", {
    status: 409,
    defined: true,
    data: { saveToken },
  });
}

/** Clicks the page's button once the version it acts on has loaded. */
async function clickPageButton(name: string) {
  const button = (
    await screen.findAllByRole("button", {
      name,
    })
  )[0] as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
  return screen.findByRole("dialog");
}

async function confirmInDialog(name: string) {
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(await within(dialog).findByRole("button", { name }));
}

async function expectNoDialog() {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

it("closes the confirmation over an Edit Conflict and shows the reason on the page", async () => {
  api.restore.mockRejectedValueOnce(editConflict("token-2"));
  renderPage();

  await clickPageButton(m.editor_history_restore_this());
  await confirmInDialog(m.editor_history_restore_action());

  // Nothing is left over the reason, and the same button does not restore
  // again without being asked.
  await expectNoDialog();
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain(m.editor_history_error_edit_conflict());
  expect(toast.error).not.toHaveBeenCalled();
  expect(api.restore).toHaveBeenCalledTimes(1);
  expect(api.restore).toHaveBeenLastCalledWith(
    expect.objectContaining({ saveToken: "token-1" }),
  );
});

it("asks again, saying what is replaced, before restoring over the newer save", async () => {
  api.restore.mockRejectedValueOnce(editConflict("token-2"));
  // Read again after the refusal, restoring anyway states what it returns.
  api.getPost
    .mockResolvedValueOnce({ saveToken: "token-1" })
    .mockResolvedValue({ saveToken: "token-2" });
  renderPage();
  await clickPageButton(m.editor_history_restore_this());
  await confirmInDialog(m.editor_history_restore_action());
  await expectNoDialog();
  await waitFor(() => expect(api.getPost).toHaveBeenCalledTimes(2));

  const dialog = await clickPageButton(m.editor_history_restore_this());
  expect(dialog.textContent).toContain(
    m.editor_history_restore_anyway_message(),
  );
  expect(api.restore).toHaveBeenCalledTimes(1);

  api.restore.mockResolvedValueOnce(undefined);
  await confirmInDialog(m.editor_history_restore_anyway());
  await waitFor(() => expect(api.restore).toHaveBeenCalledTimes(2));
  expect(api.restore).toHaveBeenLastCalledWith(
    expect.objectContaining({ saveToken: "token-2" }),
  );
  await waitFor(() => expect(navigate).toHaveBeenCalled());
});

it("closes the confirmation and names the cause when the link is taken", async () => {
  api.restore.mockRejectedValueOnce(
    new ORPCError("SLUG_TAKEN", { status: 409, defined: true }),
  );
  renderPage();
  await clickPageButton(m.editor_history_restore_this());
  await confirmInDialog(m.editor_history_restore_action());

  await expectNoDialog();
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain(m.editor_history_error_slug_taken());
  expect(toast.error).not.toHaveBeenCalled();

  // Nothing newer was saved, so asking again is the plain question.
  const dialog = await clickPageButton(m.editor_history_restore_this());
  expect(dialog.textContent).toContain(m.editor_history_restore_message());
  expect(dialog.textContent).not.toContain(
    m.editor_history_restore_anyway_message(),
  );
});

it("closes the delete confirmation when deleting fails, so the toast is readable", async () => {
  api.remove.mockRejectedValueOnce(new Error("network"));
  renderPage();

  await clickPageButton(m.editor_history_delete_action());
  await confirmInDialog(m.editor_history_delete_confirm());

  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      m.editor_history_toast_delete_failed(),
      expect.anything(),
    ),
  );
  await expectNoDialog();
});

function radio(name: string) {
  return screen.getByRole("radio", { name }) as HTMLButtonElement;
}

async function openChanges() {
  fireEvent.click(
    await screen.findByRole("radio", { name: m.editor_history_view_diff() }),
  );
  await screen.findByRole("radio", { name: m.editor_history_compare_draft() });
}

const isMarkdownRead = (call: Array<unknown>) =>
  (call[0] as { contentFormat?: string } | undefined)?.contentFormat ===
  "markdown";

it("compares with the draft by default and disables the previous version on the oldest one", async () => {
  api.revisionList.mockResolvedValue([{ id: 8 }, { id: 7 }]);
  renderPage();

  await openChanges();
  expect(radio(m.editor_history_compare_draft()).ariaChecked).toBe("true");
  await waitFor(() =>
    expect(radio(m.editor_history_compare_previous()).disabled).toBe(true),
  );
});

it("keeps the Changes view and the compare base when another version is selected", async () => {
  api.revisionList.mockResolvedValue([{ id: 8 }, { id: 7 }, { id: 6 }]);
  const { selectVersion } = renderPage(8);

  await openChanges();
  await waitFor(() =>
    expect(radio(m.editor_history_compare_previous()).disabled).toBe(false),
  );
  fireEvent.click(radio(m.editor_history_compare_previous()));

  selectVersion(7);
  expect(radio(m.editor_history_view_diff()).ariaChecked).toBe("true");
  expect(radio(m.editor_history_compare_previous()).ariaChecked).toBe("true");

  // The oldest has no older version and compares with the draft; the choice
  // comes back on the next version that has one.
  selectVersion(6);
  expect(radio(m.editor_history_view_diff()).ariaChecked).toBe("true");
  expect(radio(m.editor_history_compare_previous()).disabled).toBe(true);
  expect(radio(m.editor_history_compare_draft()).ariaChecked).toBe("true");
  selectVersion(7);
  expect(radio(m.editor_history_compare_previous()).ariaChecked).toBe("true");
});

it("makes no Markdown read until Changes is opened", async () => {
  api.revisionList.mockResolvedValue([{ id: 7 }, { id: 6 }]);
  renderPage();

  await waitFor(() => expect(api.revisionGet).toHaveBeenCalled());
  await screen.findByRole("radio", { name: m.editor_history_view_diff() });
  expect(api.revisionGet.mock.calls.some(isMarkdownRead)).toBe(false);
  expect(api.getPost.mock.calls.some(isMarkdownRead)).toBe(false);

  await openChanges();
  await waitFor(() =>
    expect(api.revisionGet.mock.calls.some(isMarkdownRead)).toBe(true),
  );
  expect(api.getPost.mock.calls.some(isMarkdownRead)).toBe(true);
});

it("ends in a failed state, not a spinner, when the draft is gone", async () => {
  api.revisionList.mockResolvedValue([{ id: 7 }, { id: 6 }]);
  api.getPost.mockImplementation(async (input: { contentFormat?: string }) => {
    if (input.contentFormat === "markdown") {
      throw new ORPCError("POST_NOT_FOUND", { status: 404, defined: true });
    }
    return { saveToken: "token-1" };
  });
  renderPage();

  await openChanges();
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain(m.editor_diff_failed());
});
