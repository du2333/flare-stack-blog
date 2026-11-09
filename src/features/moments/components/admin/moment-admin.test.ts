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
import { MomentCard } from "@/features/moments/components/moment-card";
import { MomentAdminActions, MomentComposer, MomentEditor } from "./index";
import {
  MOMENT_DRAFT_STORAGE_KEY,
  loadStoredDraft,
  saveStoredDraft,
} from "./moment-draft-storage";

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
  // The address a link names is the router's to build; its test is in moment-route.test.ts.
  Link: ({
    to,
    params,
    hash,
    children,
    ...rest
  }: {
    to: string;
    params: Record<string, string>;
    hash?: string;
    children: ReactNode;
  }) =>
    createElement(
      "a",
      {
        ...rest,
        href: `${to.replace("$id", params.id)}${hash ? `#${hash}` : ""}`,
      },
      children,
    ),
  useRouter: () => router,
  useRouteContext: () => ({
    siteConfig: {
      author: "Author",
      theme: { fuwari: { avatar: "/avatar.png" } },
    },
  }),
}));

// The card's other parts have tests of their own.
const admin = vi.hoisted(() => ({ value: true }));
vi.mock("@/features/moments/hooks/use-is-admin", () => ({
  useIsAdmin: () => admin.value,
}));
vi.mock("@/features/moments/components/moment-time", () => ({
  MomentTime: () => null,
}));
vi.mock("@/features/moments/components/moment-images", () => ({
  MomentImages: () => null,
}));

// The card's share button builds its address from the site domain.
vi.mock("@/features/config/queries", () => ({
  siteDomainQuery: {
    queryKey: ["site-domain"],
    queryFn: () => "example.com",
    initialData: "example.com",
  },
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  admin.value = true;
  for (const fn of Object.values(api)) fn.mockReset();
});

function renderWithClient(node: ReturnType<typeof createElement>) {
  return render(
    createElement(QueryClientProvider, { client: queryClient }, node),
  );
}

const textbox = () =>
  screen.getByLabelText(m.moment_admin_text_label()) as HTMLTextAreaElement;
const button = (name: string) => screen.getByRole("button", { name });
const postButton = () => button(m.moment_admin_post());
const addImages = () => button(m.moment_admin_add_images());
const addVideo = () => button(m.moment_admin_add_video());

/** A toolbar button's name when it is off, with the reason it is off. */
const off = (label: string, reason: string) =>
  m.moment_admin_button_disabled({ label, reason });

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

const media = (key: string) => ({
  key,
  url: `/images/${key}`,
  width: 4,
  height: 3,
});

/** Uploads that finish at once, each file becoming the next of `medias`. */
function uploadsAs(medias: Array<ReturnType<typeof media>>) {
  api.uploadFiles.mockImplementation(
    async (
      files: Array<File>,
      options?: {
        onFileState?: (file: File, state: string, media?: unknown) => void;
      },
    ) => {
      for (const file of files) options?.onFileState?.(file, "queued");
      const done = [];
      for (const [index, file] of files.entries()) {
        options?.onFileState?.(file, "uploading");
        options?.onFileState?.(file, "done", medias[index]);
        done.push(medias[index]);
      }
      return done;
    },
  );
}

/** Opens the image popover and picks `pick from library` once. */
function pickFromLibrary() {
  fireEvent.click(addImages());
  fireEvent.click(screen.getByText("pick from library"));
}

const tiles = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-tile]"));

it("shows one line while empty and unfocused, and opens on focus", () => {
  renderWithClient(createElement(MomentComposer));

  expect(postButton().closest("[inert]")).not.toBeNull();
  expect(textbox().placeholder).toBe(m.moment_admin_text_placeholder());

  fireEvent.focus(textbox());
  expect(postButton().closest("[inert]")).toBeNull();

  // Nothing typed and focus gone: back to one line.
  fireEvent.blur(textbox());
  expect(postButton().closest("[inert]")).not.toBeNull();

  fireEvent.focus(textbox());
  type("kept open");
  fireEvent.blur(textbox());
  expect(postButton().closest("[inert]")).toBeNull();
});

it("keeps Post off while empty or over the limit, and counts only near the limit", () => {
  renderWithClient(createElement(MomentComposer));
  expect(postButton().hasAttribute("disabled")).toBe(true);

  type("   \n ");
  expect(postButton().hasAttribute("disabled")).toBe(true);

  type("hello");
  expect(screen.queryByText("5 / 1000")).toBeNull();
  expect(postButton().hasAttribute("disabled")).toBe(false);

  type("字".repeat(899));
  expect(screen.queryByText("899 / 1000")).toBeNull();
  type("字".repeat(900));
  expect(screen.getByText("900 / 1000").className).not.toContain(
    "fuwari-danger",
  );

  type("字".repeat(1003));
  expect(screen.getByText("1003 / 1000").className).toContain("fuwari-danger");
  expect(
    screen.getByText(m.moment_admin_text_too_long({ over: 3 })),
  ).toBeTruthy();
  expect(postButton().hasAttribute("disabled")).toBe(true);

  type("a\u0000b");
  expect(screen.getByText(m.moment_admin_text_invalid())).toBeTruthy();
  expect(postButton().hasAttribute("disabled")).toBe(true);
});

it("posts on Ctrl+Enter", async () => {
  api.create.mockResolvedValue(stored({ text: "quick" }));
  renderWithClient(createElement(MomentComposer));

  type("quick");
  fireEvent.keyDown(textbox(), { key: "Enter", ctrlKey: true });

  await waitFor(() =>
    expect(api.create).toHaveBeenCalledWith({ text: "quick" }),
  );
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
  expect(textbox().value).toBe("");
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
  expect(textbox().value).toBe("kept");
  expect(onPosted).not.toHaveBeenCalled();
  expect(router.invalidate).not.toHaveBeenCalled();
});

it("posts images in the order they were added, and lets one be removed", async () => {
  api.create.mockResolvedValue(stored());
  uploadsAs([media("up.png")]);
  renderWithClient(createElement(MomentComposer));

  pickFromLibrary();
  // Uploading closes the popover and attaches the file.
  fireEvent.click(addImages());
  fireEvent.click(screen.getByText("upload files"));
  await screen.findByAltText(m.moment_admin_image_alt({ index: 2 }));
  pickFromLibrary();
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

it("shows each upload on its own and keeps Post off until they are done", async () => {
  let finish: () => void = () => {};
  api.uploadFiles.mockImplementation(
    async (
      files: Array<File>,
      options?: {
        onFileState?: (file: File, state: string, media?: unknown) => void;
      },
    ) => {
      const [first, second] = files;
      options?.onFileState?.(first, "queued");
      options?.onFileState?.(second, "queued");
      options?.onFileState?.(first, "uploading");
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      options?.onFileState?.(first, "done", media("a.png"));
      options?.onFileState?.(second, "uploading");
      options?.onFileState?.(second, "done", media("b.png"));
      return [];
    },
  );
  renderWithClient(createElement(MomentComposer));
  type("with pictures");

  fireEvent.paste(textbox(), {
    clipboardData: {
      files: [
        new File(["a"], "a.png", { type: "image/png" }),
        new File(["b"], "b.png", { type: "image/png" }),
      ],
      getData: () => "",
    },
  });

  expect(
    await screen.findByLabelText(m.moment_admin_image_uploading()),
  ).toBeTruthy();
  expect(screen.getByLabelText(m.moment_admin_image_queued())).toBeTruthy();
  expect(postButton().hasAttribute("disabled")).toBe(true);

  finish();
  await screen.findByAltText(m.moment_admin_image_alt({ index: 2 }));
  expect(screen.queryByLabelText(m.moment_admin_image_uploading())).toBeNull();
  expect(postButton().hasAttribute("disabled")).toBe(false);
});

it("uploads images pasted into the text, but leaves pasted text alone", () => {
  uploadsAs([media("shot.png")]);
  renderWithClient(createElement(MomentComposer));
  const file = new File(["x"], "shot.png", { type: "image/png" });

  // A table copied from a sheet brings a picture and its text.
  const withText = fireEvent.paste(textbox(), {
    clipboardData: { files: [file], getData: () => "a\tb" },
  });
  expect(withText).toBe(true);
  expect(api.uploadFiles).not.toHaveBeenCalled();

  const screenshot = fireEvent.paste(textbox(), {
    clipboardData: { files: [file], getData: () => "" },
  });
  expect(screenshot).toBe(false);
  expect(api.uploadFiles).toHaveBeenCalledWith([file], expect.anything());
});

it("uploads image files dropped on the box, and ignores other drags", async () => {
  uploadsAs([media("drop.png")]);
  renderWithClient(createElement(MomentComposer));
  const box = screen.getByRole("region", {
    name: m.moment_admin_composer_label(),
  });
  const file = new File(["x"], "drop.png", { type: "image/png" });

  fireEvent.drop(box, { dataTransfer: { types: ["text/plain"], files: [] } });
  expect(api.uploadFiles).not.toHaveBeenCalled();

  fireEvent.drop(box, { dataTransfer: { types: ["Files"], files: [file] } });
  await screen.findByAltText(m.moment_admin_image_alt({ index: 1 }));
  expect(api.uploadFiles).toHaveBeenCalledWith([file], expect.anything());
});

it("takes no pasted or dropped images beside a video", () => {
  renderWithClient(createElement(MomentComposer));
  fireEvent.click(addVideo());
  fireEvent.click(screen.getByText("apply direct"));

  const file = new File(["x"], "shot.png", { type: "image/png" });
  fireEvent.paste(textbox(), {
    clipboardData: { files: [file], getData: () => "" },
  });

  expect(api.uploadFiles).not.toHaveBeenCalled();
  expect(toast.info).toHaveBeenCalledWith(
    m.moment_admin_images_blocked_by_video(),
  );
});

it("takes images or a video, never both, and says why in the button's name", () => {
  renderWithClient(createElement(MomentComposer));

  pickFromLibrary();
  const blocked = button(
    off(m.moment_admin_add_video(), m.moment_admin_video_blocked_by_images()),
  );
  expect(blocked.hasAttribute("disabled")).toBe(true);
  expect(blocked.title).toContain(m.moment_admin_video_blocked_by_images());

  fireEvent.click(button(m.moment_admin_image_remove({ index: 1 })));
  expect(addVideo().hasAttribute("disabled")).toBe(false);

  fireEvent.click(addVideo());
  fireEvent.click(screen.getByText("apply direct"));
  const noImages = button(
    off(m.moment_admin_add_images(), m.moment_admin_images_blocked_by_video()),
  );
  expect(noImages.hasAttribute("disabled")).toBe(true);
  expect(noImages.title).toContain(m.moment_admin_images_blocked_by_video());
  // The video shows as a card with its own remove button.
  expect(screen.getByText("A clip")).toBeTruthy();

  fireEvent.click(button(m.moment_admin_video_remove()));
  expect(addImages().hasAttribute("disabled")).toBe(false);
});

it("posts a link video by its address and a Direct Video with the length read from the file", async () => {
  api.create.mockResolvedValue(stored());
  renderWithClient(createElement(MomentComposer));

  fireEvent.click(addVideo());
  fireEvent.click(
    screen.getByText(`apply link (${m.moment_admin_video_add()})`),
  );
  fireEvent.click(postButton());
  await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
  expect(api.create).toHaveBeenLastCalledWith({
    video: { url: "https://www.bilibili.com/video/BV1xx411c7mD/" },
  });

  await waitFor(() => expect(addVideo()).toBeTruthy());
  fireEvent.click(addVideo());
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

it("changes the order of the images with the buttons on them and by dragging, and posts that order", async () => {
  api.create.mockResolvedValue(stored());
  saveStoredDraft({
    text: "",
    images: [media("a.png"), media("b.png"), media("c.png")],
    video: null,
  });
  renderWithClient(createElement(MomentComposer));
  const order = () => tiles().map((tile) => tile.dataset.tile);
  expect(order()).toEqual(["a.png", "b.png", "c.png"]);

  // The first cannot go earlier, the last cannot go later.
  expect(
    button(m.moment_admin_image_move_earlier({ index: 1 })).hasAttribute(
      "disabled",
    ),
  ).toBe(true);
  fireEvent.click(button(m.moment_admin_image_move_later({ index: 1 })));
  expect(order()).toEqual(["b.png", "a.png", "c.png"]);

  const data = { setData: vi.fn(), types: [] as Array<string> };
  const [, , last] = tiles();
  fireEvent.dragStart(last, { dataTransfer: data });
  fireEvent.dragOver(tiles()[0], { dataTransfer: data });
  fireEvent.drop(tiles()[0], { dataTransfer: data });
  expect(order()).toEqual(["c.png", "b.png", "a.png"]);

  fireEvent.click(postButton());
  await waitFor(() => expect(api.create).toHaveBeenCalled());
  expect(api.create).toHaveBeenCalledWith({
    images: ["/images/c.png", "/images/b.png", "/images/a.png"],
  });
});

it("previews twelve images as nine with +3, which opens to manage them all", () => {
  saveStoredDraft({
    text: "",
    images: Array.from({ length: 12 }, (_, i) => media(`${i}.png`)),
    video: null,
  });
  renderWithClient(createElement(MomentComposer));

  expect(tiles()).toHaveLength(9);
  fireEvent.click(button(m.moment_admin_images_expand({ count: 12 })));
  expect(tiles()).toHaveLength(12);

  fireEvent.click(button(m.moment_admin_images_collapse()));
  expect(tiles()).toHaveLength(9);
});

it("turns the images button off at fifty images and says why", () => {
  saveStoredDraft({
    text: "",
    images: Array.from({ length: 50 }, (_, i) => media(`${i}.png`)),
    video: null,
  });
  renderWithClient(createElement(MomentComposer));

  const full = button(
    off(m.moment_admin_add_images(), m.moment_admin_images_full({ limit: 50 })),
  );
  expect(full.hasAttribute("disabled")).toBe(true);
});

it("restores an unsent draft, keeps it as it changes and drops it once posted", async () => {
  api.create.mockResolvedValue(stored());
  saveStoredDraft({
    text: "left half way",
    images: [media("kept.png")],
    video: null,
  });
  renderWithClient(createElement(MomentComposer));

  expect(textbox().value).toBe("left half way");
  expect(
    screen.getByAltText(m.moment_admin_image_alt({ index: 1 })),
  ).toBeTruthy();

  type("left half way, then more");
  expect(loadStoredDraft()?.text).toBe("left half way, then more");

  fireEvent.click(postButton());
  await waitFor(() => expect(api.create).toHaveBeenCalled());
  expect(api.create).toHaveBeenCalledWith({
    text: "left half way, then more",
    images: ["/images/kept.png"],
  });
  await waitFor(() => expect(textbox().value).toBe(""));
  expect(loadStoredDraft()).toBeNull();
  expect(localStorage.getItem(MOMENT_DRAFT_STORAGE_KEY)).toBeNull();
});

it("still works where the browser refuses storage", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  renderWithClient(createElement(MomentComposer));

  type("typed anyway");
  expect(textbox().value).toBe("typed anyway");
  expect(postButton().hasAttribute("disabled")).toBe(false);
});

function renderEditor(
  moment: PublicMoment = stored(),
  onDone: () => void = vi.fn(),
) {
  renderWithClient(createElement(MomentEditor, { moment, onDone }));
  return onDone;
}

it("fills in with the Moment as shown, reads it with its token and saves only what changed", async () => {
  api.get.mockResolvedValue(stored());
  api.update.mockResolvedValue(
    stored({ text: "new words", saveToken: "token-2" }),
  );
  const onDone = renderEditor();

  // Prefilled and not editable until the read arrives.
  expect(textbox().value).toBe("first words");
  expect(textbox().readOnly).toBe(true);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith({ id: 7 }));
  await waitFor(() => expect(textbox().readOnly).toBe(false));

  // Saving nothing is not offered.
  const save = button(m.moment_admin_save());
  expect(save.hasAttribute("disabled")).toBe(true);

  type("new words");
  fireEvent.click(save);

  await waitFor(() => expect(api.update).toHaveBeenCalled());
  expect(api.update).toHaveBeenCalledWith({
    id: 7,
    data: { text: "new words" },
    saveToken: "token-1",
  });
  await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  expect(toast.success).toHaveBeenCalledWith(m.moment_admin_saved());
  expect(invalidated).toHaveBeenCalledWith({ queryKey: ["moments"] });
  expect(router.invalidate).toHaveBeenCalled();
});

it("gives the card back on Cancel without saving and keeps no draft", async () => {
  api.get.mockResolvedValue(stored());
  const onDone = renderEditor();
  await waitFor(() => expect(textbox().readOnly).toBe(false));

  type("edited but abandoned");
  expect(loadStoredDraft()).toBeNull();
  fireEvent.click(button(m.common_cancel()));

  expect(onDone).toHaveBeenCalledTimes(1);
  expect(api.update).not.toHaveBeenCalled();
});

it("offers a retry when the Moment cannot be read", async () => {
  api.get.mockRejectedValueOnce(refused("INTERNAL"));
  renderEditor();

  expect(await screen.findByText(m.moment_admin_load_failed())).toBeTruthy();
  expect(textbox().readOnly).toBe(true);

  api.get.mockResolvedValueOnce(
    stored({ text: "fresh", saveToken: "token-3" }),
  );
  fireEvent.click(button(m.moment_admin_retry()));
  await waitFor(() => expect(textbox().value).toBe("fresh"));
  expect(textbox().readOnly).toBe(false);
});

it("says a Moment was changed elsewhere and loads the current version on request", async () => {
  api.get.mockResolvedValueOnce(stored());
  api.update.mockRejectedValue(
    new ORPCError("EDIT_CONFLICT", {
      status: 409,
      data: { saveToken: "token-9" },
    }),
  );
  const onDone = renderEditor();
  await waitFor(() => expect(textbox().readOnly).toBe(false));

  type("mine");
  fireEvent.click(button(m.moment_admin_save()));

  expect(await screen.findByText(m.moment_admin_conflict_title())).toBeTruthy();
  expect(toast.success).not.toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();
  // Saving again would only conflict again.
  expect(button(m.moment_admin_save()).hasAttribute("disabled")).toBe(true);
  // What was typed stays until the Admin chooses to load the current version.
  expect(textbox().value).toBe("mine");

  api.get.mockResolvedValueOnce(
    stored({ text: "theirs", saveToken: "token-9" }),
  );
  fireEvent.click(button(m.moment_admin_conflict_load()));
  await waitFor(() => expect(textbox().value).toBe("theirs"));
  expect(screen.queryByText(m.moment_admin_conflict_title())).toBeNull();

  api.update.mockResolvedValue(stored({ text: "theirs and mine" }));
  type("theirs and mine");
  fireEvent.click(button(m.moment_admin_save()));
  await waitFor(() => expect(api.update).toHaveBeenCalledTimes(2));
  expect(api.update).toHaveBeenLastCalledWith({
    id: 7,
    data: { text: "theirs and mine" },
    saveToken: "token-9",
  });
});

it("swaps the card for the editor and back, only for the Admin", async () => {
  api.get.mockResolvedValue(stored());
  api.update.mockResolvedValue(stored({ text: "changed" }));
  renderWithClient(createElement(MomentCard, { moment: stored() }));

  expect(screen.getByText("first words")).toBeTruthy();
  fireEvent.click(button(m.moment_admin_edit()));
  expect(screen.queryByRole("article")).toBeNull();
  await waitFor(() => expect(textbox().readOnly).toBe(false));

  type("changed");
  fireEvent.click(button(m.moment_admin_save()));
  await waitFor(() => expect(screen.getByRole("article")).toBeTruthy());
});

it("leaves a reader's card without the edit button", () => {
  admin.value = false;
  renderWithClient(createElement(MomentCard, { moment: stored() }));

  expect(
    screen.queryByRole("button", { name: m.moment_admin_edit() }),
  ).toBeNull();
});

it("asks for the edit and leaves the rest to the card", () => {
  const onEdit = vi.fn();
  renderWithClient(
    createElement(MomentAdminActions, { moment: stored(), onEdit }),
  );

  fireEvent.click(button(m.moment_admin_edit()));
  expect(onEdit).toHaveBeenCalledTimes(1);
  expect(api.get).not.toHaveBeenCalled();
});

it("asks before deleting, then deletes and refreshes", async () => {
  api.remove.mockResolvedValue({ success: true });
  renderWithClient(
    createElement(MomentAdminActions, { moment: stored(), onEdit: vi.fn() }),
  );

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

it("says how many comments go with a Moment that has some", async () => {
  renderWithClient(
    createElement(MomentAdminActions, {
      moment: stored({ commentCount: 12 }),
      onEdit: vi.fn(),
    }),
  );

  fireEvent.click(button(m.moment_admin_delete()));
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByText(
      m.moment_admin_delete_message_with_comments({ count: 12 }),
    ).textContent,
  ).toContain("12");
  expect(
    within(dialog).queryByText(m.moment_admin_delete_message()),
  ).toBeNull();
});

it("leaves the comments out of the delete message when there are none", async () => {
  renderWithClient(
    createElement(MomentAdminActions, { moment: stored(), onEdit: vi.fn() }),
  );

  fireEvent.click(button(m.moment_admin_delete()));
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByText(m.moment_admin_delete_message()),
  ).toBeTruthy();
});

it("shows the comment count with a comment icon, linking to the comment section", () => {
  admin.value = false;
  renderWithClient(
    createElement(MomentCard, { moment: stored({ commentCount: 3 }) }),
  );

  const link = screen.getByRole("link", {
    name: m.moments_comments_count({ count: 3 }),
  });
  expect(link.getAttribute("href")).toBe("/moments/7#comments");
  expect(link.textContent).toBe("3");
  expect(link.querySelector("svg")).toBeTruthy();
});

it("shows 评论 instead of 0 on a Moment nobody has commented on", () => {
  admin.value = false;
  renderWithClient(createElement(MomentCard, { moment: stored() }));

  const link = screen.getByRole("link", { name: m.moments_comments() });
  expect(link.getAttribute("href")).toBe("/moments/7#comments");
  expect(link.textContent).toBe(m.moments_comments());
  expect(link.textContent).not.toContain("0");
});

it("shows the count to the Admin too, but not while the card is being edited", () => {
  api.get.mockResolvedValue(stored());
  renderWithClient(
    createElement(MomentCard, { moment: stored({ commentCount: 2 }) }),
  );

  expect(screen.getByRole("link", { name: /2/ })).toBeTruthy();
  fireEvent.click(button(m.moment_admin_edit()));
  expect(screen.queryByRole("link", { name: /2/ })).toBeNull();
});

it("puts a share button beside the comment count, and drops it while the card is edited", () => {
  api.get.mockResolvedValue(stored());
  renderWithClient(createElement(MomentCard, { moment: stored() }));

  expect(button(m.common_share())).toBeTruthy();
  fireEvent.click(button(m.moment_admin_edit()));
  expect(screen.queryByRole("button", { name: m.common_share() })).toBeNull();
});

it("does not delete when the Admin backs out", async () => {
  renderWithClient(
    createElement(MomentAdminActions, { moment: stored(), onEdit: vi.fn() }),
  );

  fireEvent.click(button(m.moment_admin_delete()));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(
    within(dialog).getByRole("button", { name: m.common_cancel() }),
  );

  expect(api.remove).not.toHaveBeenCalled();
});
