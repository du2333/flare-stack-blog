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
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type {
  AdminMoment,
  PublicMoment,
} from "@/features/moments/schema/moments.schema";
import { m } from "@/paraglide/messages";
import { MomentAdminActions, MomentComposer } from "./index";

// Unmount as soon as something closes; exit motion is not under test.
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const router = vi.hoisted(() => ({ invalidate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
  useRouter: () => router,
}));

const api = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  uploadFiles: vi.fn(),
}));
vi.mock("@/lib/orpc", () => ({
  orpcClient: {
    moments: {
      admin: {
        create: api.create,
        get: api.get,
        update: api.update,
        remove: api.remove,
      },
    },
    posts: { admin: { directVideo: vi.fn() } },
  },
}));

// The media library and the video panel have tests of their own; here they
// are two buttons each that hand the form what they would.
vi.mock("@/features/media/components/media-library/hooks", () => ({
  useMediaPicker: () => ({
    mediaItems: [],
    loadMore: vi.fn(),
    hasMore: false,
    isLoadingMore: false,
    isPending: false,
  }),
  useMediaUpload: () => ({
    uploadFiles: api.uploadFiles,
    progress: null,
    isUploading: false,
  }),
}));
vi.mock("@/features/media/components/media-library/components", async () => {
  const { createElement: h } = await import("react");
  return {
    ImageSourcePicker: ({
      onSelect,
      onFiles,
    }: {
      onSelect: (asset: unknown) => void;
      onFiles: (files: Array<File>) => void;
    }) =>
      h(
        "div",
        null,
        h(
          "button",
          {
            type: "button",
            onClick: () =>
              onSelect({
                key: "library.png",
                url: "/images/library.png",
                width: 4,
                height: 3,
              }),
          },
          "pick from library",
        ),
        h(
          "button",
          {
            type: "button",
            onClick: () => onFiles([new File(["x"], "a.png")]),
          },
          "upload files",
        ),
      ),
  };
});
vi.mock(
  "@/features/posts/editor/extensions/video/video-editor-panel",
  async () => {
    const { createElement: h } = await import("react");
    return {
      VideoEditorPanel: ({
        onApply,
        onApplyDirect,
        applyLabel,
      }: {
        onApply: (source: unknown) => void;
        onApplyDirect: (video: unknown) => void;
        applyLabel?: string;
      }) =>
        h(
          "div",
          null,
          h(
            "button",
            {
              type: "button",
              onClick: () =>
                onApply({
                  provider: "bilibili",
                  videoId: "BV1xx411c7mD",
                  page: null,
                  start: null,
                }),
            },
            `apply link (${applyLabel})`,
          ),
          h(
            "button",
            {
              type: "button",
              onClick: () =>
                onApplyDirect({
                  src: "https://video.example/clip.mp4",
                  pageUrl: null,
                  title: "A clip",
                  cover: null,
                  duration: 95,
                }),
            },
            "apply direct",
          ),
        ),
    };
  },
);

let queryClient: QueryClient;
let invalidated: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  invalidated = vi.spyOn(queryClient, "invalidateQueries");
  router.invalidate.mockResolvedValue(undefined);
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
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  for (const fn of Object.values(api)) fn.mockReset();
});

function renderWithClient(node: ReturnType<typeof createElement>) {
  return render(
    createElement(QueryClientProvider, { client: queryClient }, node),
  );
}

const textbox = () => screen.getByLabelText(m.moment_admin_text_label());
const button = (name: string) => screen.getByRole("button", { name });
const postButton = () => button(m.moment_admin_post());

function type(text: string) {
  fireEvent.change(textbox(), { target: { value: text } });
}

function stored(change: Partial<AdminMoment> = {}): AdminMoment {
  return {
    id: 7,
    text: "first words",
    images: [],
    video: null,
    postedAt: new Date(0),
    updatedAt: new Date(0),
    commentCount: 0,
    saveToken: "token-1",
    ...change,
  };
}

function refused(code: string, data?: unknown) {
  return new ORPCError(code, { status: 400, data });
}

it("keeps Post off while empty or over the limit, and counts as it is typed", () => {
  renderWithClient(createElement(MomentComposer));
  expect(postButton().hasAttribute("disabled")).toBe(true);

  type("   \n ");
  expect(postButton().hasAttribute("disabled")).toBe(true);

  type("hello");
  expect(screen.getByText("5 / 1000")).toBeTruthy();
  expect(postButton().hasAttribute("disabled")).toBe(false);

  type("字".repeat(1003));
  expect(screen.getByText("1003 / 1000")).toBeTruthy();
  expect(
    screen.getByText(m.moment_admin_text_too_long({ over: 3 })),
  ).toBeTruthy();
  expect(postButton().hasAttribute("disabled")).toBe(true);

  type("a\u0000b");
  expect(screen.getByText(m.moment_admin_text_invalid())).toBeTruthy();
  expect(postButton().hasAttribute("disabled")).toBe(true);
});

it("posts, then clears the form, refreshes the page data and calls onPosted", async () => {
  api.create.mockResolvedValue(stored({ text: "hello" }));
  const onPosted = vi.fn();
  renderWithClient(createElement(MomentComposer, { onPosted }));

  type("  hello \n");
  fireEvent.click(postButton());

  await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
  expect(api.create).toHaveBeenCalledWith({ text: "hello" });
  expect(invalidated).toHaveBeenCalledWith({ queryKey: ["moments"] });
  expect(router.invalidate).toHaveBeenCalled();
  expect(toast.success).toHaveBeenCalledWith(m.moment_admin_posted());
  expect((textbox() as HTMLTextAreaElement).value).toBe("");
});

it("keeps what was typed and says why when the server refuses", async () => {
  api.create.mockRejectedValue(refused("MOMENT_IMAGE_NOT_FOUND"));
  const onPosted = vi.fn();
  renderWithClient(createElement(MomentComposer, { onPosted }));

  type("kept");
  fireEvent.click(postButton());

  expect(
    await screen.findByText(m.moment_admin_error_image_not_found()),
  ).toBeTruthy();
  expect((textbox() as HTMLTextAreaElement).value).toBe("kept");
  expect(onPosted).not.toHaveBeenCalled();
  expect(router.invalidate).not.toHaveBeenCalled();
});

it("posts images in the order they were added, and lets one be removed", async () => {
  api.create.mockResolvedValue(stored());
  api.uploadFiles.mockResolvedValue([
    { key: "up.png", url: "/images/up.png", width: 1, height: 2 },
  ]);
  renderWithClient(createElement(MomentComposer));

  fireEvent.click(button(m.moment_admin_add_images()));
  fireEvent.click(screen.getByText("pick from library"));
  fireEvent.click(screen.getByText("upload files"));
  await screen.findByAltText(m.moment_admin_image_alt({ index: 2 }));
  fireEvent.click(screen.getByText("pick from library"));
  expect(toast.info).toHaveBeenCalledWith(m.moment_admin_image_duplicate());
  expect(screen.getAllByRole("img")).toHaveLength(2);

  // Images alone are enough to post.
  expect(postButton().hasAttribute("disabled")).toBe(false);
  fireEvent.click(button(m.moment_admin_image_remove({ index: 1 })));
  expect(screen.getAllByRole("img")).toHaveLength(1);

  fireEvent.click(postButton());
  await waitFor(() => expect(api.create).toHaveBeenCalled());
  expect(api.create).toHaveBeenCalledWith({ images: ["/images/up.png"] });
});

it("takes images or a video, never both", () => {
  renderWithClient(createElement(MomentComposer));

  fireEvent.click(button(m.moment_admin_add_images()));
  fireEvent.click(screen.getByText("pick from library"));
  expect(button(m.moment_admin_add_video()).hasAttribute("disabled")).toBe(
    true,
  );
  expect(
    screen.getByText(m.moment_admin_video_blocked_by_images()),
  ).toBeTruthy();

  fireEvent.click(button(m.moment_admin_image_remove({ index: 1 })));
  expect(button(m.moment_admin_add_video()).hasAttribute("disabled")).toBe(
    false,
  );

  fireEvent.click(button(m.moment_admin_add_video()));
  fireEvent.click(screen.getByText("apply direct"));
  expect(button(m.moment_admin_add_images()).hasAttribute("disabled")).toBe(
    true,
  );
  expect(
    screen.getByText(m.moment_admin_images_blocked_by_video()),
  ).toBeTruthy();

  fireEvent.click(button(m.moment_admin_video_remove()));
  expect(button(m.moment_admin_add_images()).hasAttribute("disabled")).toBe(
    false,
  );
});

it("posts a link video by its address and a Direct Video with the length read from the file", async () => {
  api.create.mockResolvedValue(stored());
  renderWithClient(createElement(MomentComposer));

  fireEvent.click(button(m.moment_admin_add_video()));
  fireEvent.click(
    screen.getByText(`apply link (${m.moment_admin_video_add()})`),
  );
  fireEvent.click(postButton());
  await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
  expect(api.create).toHaveBeenLastCalledWith({
    video: { url: "https://www.bilibili.com/video/BV1xx411c7mD/" },
  });

  await waitFor(() => expect(button(m.moment_admin_add_video())).toBeTruthy());
  fireEvent.click(button(m.moment_admin_add_video()));
  fireEvent.click(screen.getByText("apply direct"));
  fireEvent.click(postButton());
  await waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));
  expect(api.create).toHaveBeenLastCalledWith({
    video: {
      src: "https://video.example/clip.mp4",
      poster: null,
      title: "A clip",
      page: null,
      duration: 95,
    },
  });
});

function openEditor() {
  const moment: PublicMoment = stored();
  renderWithClient(createElement(MomentAdminActions, { moment }));
  fireEvent.click(button(m.moment_admin_edit()));
}

it("reads the Moment to edit and saves only what changed, with the token it read", async () => {
  api.get.mockResolvedValue(stored());
  api.update.mockResolvedValue(
    stored({ text: "new words", saveToken: "token-2" }),
  );
  openEditor();

  const dialog = await screen.findByRole("dialog");
  expect(api.get).toHaveBeenCalledWith({ id: 7 });
  const field = await within(dialog).findByLabelText(
    m.moment_admin_text_label(),
  );
  expect((field as HTMLTextAreaElement).value).toBe("first words");

  // Saving nothing is not offered.
  const save = within(dialog).getByRole("button", {
    name: m.moment_admin_save(),
  });
  expect(save.hasAttribute("disabled")).toBe(true);

  fireEvent.change(field, { target: { value: "new words" } });
  fireEvent.click(save);

  await waitFor(() => expect(api.update).toHaveBeenCalled());
  expect(api.update).toHaveBeenCalledWith({
    id: 7,
    data: { text: "new words" },
    saveToken: "token-1",
  });
  await waitFor(() =>
    expect(toast.success).toHaveBeenCalledWith(m.moment_admin_saved()),
  );
  expect(invalidated).toHaveBeenCalledWith({ queryKey: ["moments"] });
  expect(router.invalidate).toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("says a Moment was changed elsewhere and loads the current version on request", async () => {
  api.get.mockResolvedValueOnce(stored());
  api.update.mockRejectedValue(
    new ORPCError("EDIT_CONFLICT", {
      status: 409,
      data: { saveToken: "token-9" },
    }),
  );
  openEditor();

  const dialog = await screen.findByRole("dialog");
  const field = await within(dialog).findByLabelText(
    m.moment_admin_text_label(),
  );
  fireEvent.change(field, { target: { value: "mine" } });
  fireEvent.click(
    within(dialog).getByRole("button", { name: m.moment_admin_save() }),
  );

  expect(
    await within(dialog).findByText(m.moment_admin_conflict_title()),
  ).toBeTruthy();
  expect(toast.success).not.toHaveBeenCalled();
  // Saving again would only conflict again.
  expect(
    within(dialog)
      .getByRole("button", { name: m.moment_admin_save() })
      .hasAttribute("disabled"),
  ).toBe(true);
  // What was typed stays until the Admin chooses to load the current version.
  expect(
    (
      within(dialog).getByLabelText(
        m.moment_admin_text_label(),
      ) as HTMLTextAreaElement
    ).value,
  ).toBe("mine");

  api.get.mockResolvedValueOnce(
    stored({ text: "theirs", saveToken: "token-9" }),
  );
  fireEvent.click(
    within(dialog).getByRole("button", {
      name: m.moment_admin_conflict_load(),
    }),
  );
  await waitFor(() =>
    expect(
      (
        within(dialog).getByLabelText(
          m.moment_admin_text_label(),
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("theirs"),
  );
  expect(
    within(dialog).queryByText(m.moment_admin_conflict_title()),
  ).toBeNull();

  api.update.mockResolvedValue(stored({ text: "theirs and mine" }));
  fireEvent.change(within(dialog).getByLabelText(m.moment_admin_text_label()), {
    target: { value: "theirs and mine" },
  });
  fireEvent.click(
    within(dialog).getByRole("button", { name: m.moment_admin_save() }),
  );
  await waitFor(() => expect(api.update).toHaveBeenCalledTimes(2));
  expect(api.update).toHaveBeenLastCalledWith({
    id: 7,
    data: { text: "theirs and mine" },
    saveToken: "token-9",
  });
});

it("asks before deleting, then deletes and refreshes", async () => {
  api.remove.mockResolvedValue({ success: true });
  renderWithClient(createElement(MomentAdminActions, { moment: stored() }));

  fireEvent.click(button(m.moment_admin_delete()));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(m.moment_admin_delete_title())).toBeTruthy();
  expect(api.remove).not.toHaveBeenCalled();

  fireEvent.click(
    within(dialog).getByRole("button", {
      name: m.moment_admin_delete_confirm(),
    }),
  );
  await waitFor(() => expect(api.remove).toHaveBeenCalledWith({ id: 7 }));
  await waitFor(() =>
    expect(toast.success).toHaveBeenCalledWith(m.moment_admin_deleted()),
  );
  expect(invalidated).toHaveBeenCalledWith({ queryKey: ["moments"] });
  expect(router.invalidate).toHaveBeenCalled();
});

it("does not delete when the Admin backs out", async () => {
  renderWithClient(createElement(MomentAdminActions, { moment: stored() }));

  fireEvent.click(button(m.moment_admin_delete()));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(
    within(dialog).getByRole("button", { name: m.common_cancel() }),
  );

  expect(api.remove).not.toHaveBeenCalled();
});
