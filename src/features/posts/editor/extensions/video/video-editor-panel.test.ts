// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { DirectVideoLookup } from "@/features/posts/utils/video-source";
import { m } from "@/paraglide/messages";
import { readVideoDuration } from "./read-duration";
import type { ResolveDirectVideo } from "./use-direct-video-lookup";
import { VideoEditorPanel } from "./video-editor-panel";
import type { VideoEditorPanelProps } from "./video-editor-panel";

vi.mock("./read-duration", () => ({ readVideoDuration: vi.fn() }));

const FILE = "https://cdn.example.com/clip.mp4";
const PAGE = "https://example.com/watch/1";
const OWN_FILE = "https://cdn.example.com/own.mp4";

const resolve = vi.fn<ResolveDirectVideo>();
const onApply = vi.fn();
const onApplyDirect = vi.fn();
const onCancel = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(readVideoDuration).mockResolvedValue(95);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  resolve.mockReset();
});

function panel(props: Partial<VideoEditorPanelProps> = {}) {
  return render(
    createElement(VideoEditorPanel, {
      link: "",
      inserted: true,
      resolveDirectVideo: resolve,
      onApply,
      onApplyDirect,
      onCancel,
      ...props,
    }),
  );
}

const addressInput = () => screen.getByLabelText(m.editor_video_input());
const insertButton = () =>
  screen.getByRole("button", { name: m.editor_video_insert() });
const field = (label: string) => screen.getByLabelText(new RegExp(label));
const queryField = (label: string) =>
  screen.queryByLabelText(new RegExp(label));

/** Types into the address and lets the typing pause. */
async function type(text: string, input: HTMLElement = addressInput()) {
  fireEvent.change(input, { target: { value: text } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
}

async function apply() {
  await act(async () => {
    fireEvent.click(insertButton());
  });
}

const file = (src = FILE): DirectVideoLookup => ({ kind: "file", src });
const page = (
  src: string | null,
  extra: Partial<Extract<DirectVideoLookup, { kind: "page" }>> = {},
): DirectVideoLookup => ({
  kind: "page",
  pageUrl: PAGE,
  src,
  title: "Page title",
  cover: "https://example.com/cover.jpg",
  ...extra,
});

it("leaves Bilibili and YouTube links as they were, and looks nothing up", async () => {
  panel();
  await type("https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2");

  expect(screen.getByRole("status").textContent).toContain("BV1fK4y1s7Qf");
  expect(queryField(m.editor_video_title_label())).toBeNull();
  await apply();

  expect(resolve).not.toHaveBeenCalled();
  expect(onApply).toHaveBeenCalledWith({
    provider: "bilibili",
    videoId: "BV1fK4y1s7Qf",
    page: 2,
    start: null,
  });
  expect(onApplyDirect).not.toHaveBeenCalled();
});

it("looks an address up only once typing pauses, showing it is being read", async () => {
  let answer: (lookup: DirectVideoLookup) => void = () => {};
  resolve.mockReturnValue(new Promise((done) => (answer = done)));
  panel();

  fireEvent.change(addressInput(), { target: { value: FILE } });
  expect(resolve).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe(m.editor_video_reading());
  expect(insertButton().hasAttribute("disabled")).toBe(true);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  expect(resolve).toHaveBeenCalledExactlyOnceWith(FILE);
  expect(screen.getByRole("status").textContent).toBe(m.editor_video_reading());

  await act(async () => answer(file()));
  expect(screen.getByRole("status").textContent).toBe(
    m.editor_video_direct_file(),
  );
});

it("embeds a video file at the address, with its title and cover and the length read from it", async () => {
  resolve.mockResolvedValue(file());
  panel();
  await type(FILE);

  // The address is the file, so there is no other playback address to give.
  expect(queryField(m.editor_video_src_label())).toBeNull();
  fireEvent.change(field(m.editor_video_title_label()), {
    target: { value: "  My clip " },
  });
  fireEvent.change(field(m.editor_video_cover_label()), {
    target: { value: "https://example.com/poster.png" },
  });
  await apply();

  expect(readVideoDuration).toHaveBeenCalledWith(FILE);
  expect(onApplyDirect).toHaveBeenCalledExactlyOnceWith({
    src: FILE,
    pageUrl: null,
    title: "My clip",
    cover: "https://example.com/poster.png",
    duration: 95,
  });
});

it("embeds a page's video with the title and cover it gave, keeping the page", async () => {
  resolve.mockResolvedValue(page(FILE));
  panel();
  await type(PAGE);

  expect((field(m.editor_video_title_label()) as HTMLInputElement).value).toBe(
    "Page title",
  );
  expect((field(m.editor_video_cover_label()) as HTMLInputElement).value).toBe(
    "https://example.com/cover.jpg",
  );
  await apply();

  expect(onApplyDirect).toHaveBeenCalledWith({
    src: FILE,
    pageUrl: PAGE,
    title: "Page title",
    cover: "https://example.com/cover.jpg",
    duration: 95,
  });
});

it("asks for a playback address when the page has no video, and checks it is a file", async () => {
  resolve.mockResolvedValueOnce(page(null));
  panel();
  await type(PAGE);

  expect(screen.getByRole("status").textContent).toBe(
    m.editor_video_direct_page_empty(),
  );
  expect(insertButton().hasAttribute("disabled")).toBe(true);

  resolve.mockResolvedValueOnce(file(OWN_FILE));
  await type(OWN_FILE, field(m.editor_video_src_label()));
  expect(resolve).toHaveBeenLastCalledWith(OWN_FILE);
  expect(insertButton().hasAttribute("disabled")).toBe(false);
  await apply();

  expect(onApplyDirect).toHaveBeenCalledWith(
    expect.objectContaining({ src: OWN_FILE, pageUrl: PAGE }),
  );
});

it("refuses a playback address that is a page, not a file", async () => {
  resolve.mockResolvedValueOnce(page(null));
  panel();
  await type(PAGE);

  resolve.mockResolvedValueOnce(page(null, { pageUrl: "https://a.test/p" }));
  await type("https://a.test/p", field(m.editor_video_src_label()));

  expect(screen.getByRole("alert").textContent).toBe(
    m.editor_video_src_not_file(),
  );
  expect(insertButton().hasAttribute("disabled")).toBe(true);
});

it("rejects a playback address that is not https without looking it up", async () => {
  resolve.mockResolvedValueOnce(page(null));
  panel();
  await type(PAGE);
  await type("http://a.test/v.mp4", field(m.editor_video_src_label()));

  expect(resolve).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert").textContent).toBe(
    m.editor_video_address_invalid(),
  );
  expect(insertButton().hasAttribute("disabled")).toBe(true);
});

it("lets the page's video be replaced by the Admin's own file", async () => {
  resolve.mockResolvedValueOnce(page(FILE));
  panel();
  await type(PAGE);

  resolve.mockResolvedValueOnce(file(OWN_FILE));
  await type(OWN_FILE, field(m.editor_video_src_label()));
  await apply();

  expect(onApplyDirect).toHaveBeenCalledWith(
    expect.objectContaining({ src: OWN_FILE, pageUrl: PAGE }),
  );
});

it.each([
  [
    "answers it cannot reach the address",
    () => resolve.mockRejectedValue(new Error("x")),
  ],
  [
    "says it is unreachable",
    () => resolve.mockResolvedValue({ kind: "unreachable" }),
  ],
])(
  "still allows filling a video in by hand when the lookup %s",
  async (_, arrange) => {
    arrange();
    panel();
    await type(FILE);

    expect(screen.getByRole("status").textContent).toBe(
      m.editor_video_direct_unreachable(),
    );
    // With nothing else given, the address is taken to be the file itself.
    await apply();
    expect(onApplyDirect).toHaveBeenCalledWith(
      expect.objectContaining({ src: FILE, pageUrl: null }),
    );
  },
);

it("takes an unreachable address as the page when another playback address is given", async () => {
  resolve.mockResolvedValueOnce({ kind: "unreachable" });
  panel();
  await type(PAGE);

  resolve.mockResolvedValueOnce({ kind: "unreachable" });
  await type(OWN_FILE, field(m.editor_video_src_label()));
  await apply();

  expect(onApplyDirect).toHaveBeenCalledWith(
    expect.objectContaining({ src: OWN_FILE, pageUrl: PAGE }),
  );
});

it("says an address that is neither a file nor a page is not supported", async () => {
  resolve.mockResolvedValue({ kind: "unsupported" });
  panel();
  await type(FILE);

  expect(screen.getByRole("status").textContent).toBe(
    m.editor_video_direct_unsupported(),
  );
  expect(queryField(m.editor_video_title_label())).toBeNull();
  expect(insertButton().hasAttribute("disabled")).toBe(true);
});

it("does not look up anything that is not an https address", async () => {
  panel();
  for (const text of [
    "http://a.test/v.mp4",
    "javascript:alert(1)",
    "a.test/v",
  ]) {
    await type(text);
    expect(screen.getByRole("status").textContent).toBe(
      m.editor_video_unsupported(),
    );
  }
  expect(resolve).not.toHaveBeenCalled();
});

it("discards the fields of one address when another is typed", async () => {
  resolve.mockResolvedValueOnce(page(FILE));
  panel();
  await type(PAGE);
  fireEvent.change(field(m.editor_video_title_label()), {
    target: { value: "Edited" },
  });

  resolve.mockResolvedValueOnce(file(OWN_FILE));
  await type(OWN_FILE);
  expect((field(m.editor_video_title_label()) as HTMLInputElement).value).toBe(
    "",
  );
});

it("ignores a late answer for an address that was typed over", async () => {
  let late: (lookup: DirectVideoLookup) => void = () => {};
  resolve.mockReturnValueOnce(new Promise((done) => (late = done)));
  panel();
  await type(PAGE);
  resolve.mockResolvedValueOnce(file(OWN_FILE));
  await type(OWN_FILE);
  await act(async () => late(page(FILE)));

  expect(screen.getByRole("status").textContent).toBe(
    m.editor_video_direct_file(),
  );
  expect(queryField(m.editor_video_src_label())).toBeNull();
});

it("reopens a Direct Video with its fields filled in and does not fetch it again", async () => {
  const direct = {
    src: FILE,
    pageUrl: PAGE,
    title: "Kept title",
    cover: "https://example.com/c.jpg",
    duration: 61,
  };
  panel({ link: PAGE, direct, inserted: false });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });

  expect((addressInput() as HTMLInputElement).value).toBe(PAGE);
  expect((field(m.editor_video_title_label()) as HTMLInputElement).value).toBe(
    "Kept title",
  );
  expect((field(m.editor_video_src_label()) as HTMLInputElement).value).toBe(
    FILE,
  );
  expect(resolve).not.toHaveBeenCalled();

  // The file is unchanged, so its length is not read again.
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: m.editor_video_update() }),
    );
  });
  expect(readVideoDuration).not.toHaveBeenCalled();
  expect(onApplyDirect).toHaveBeenCalledWith(direct);
});

it("looks a reopened Direct Video up again once its address changes", async () => {
  panel({
    link: FILE,
    direct: { src: FILE, pageUrl: null, title: null, cover: null, duration: 5 },
    inserted: false,
  });
  resolve.mockResolvedValue(file(OWN_FILE));
  await type(OWN_FILE);

  expect(resolve).toHaveBeenCalledExactlyOnceWith(OWN_FILE);
});

it("fetches nothing without a lookup, and still allows entering a video", async () => {
  panel({ resolveDirectVideo: undefined });
  await type(FILE);

  expect(resolve).not.toHaveBeenCalled();
  expect(insertButton().hasAttribute("disabled")).toBe(false);
  await apply();
  expect(onApplyDirect).toHaveBeenCalledWith(
    expect.objectContaining({ src: FILE }),
  );
});

it("applies on Enter and cancels on Escape, in any of its inputs", async () => {
  resolve.mockResolvedValue(file());
  panel();
  await type(FILE);

  fireEvent.keyDown(field(m.editor_video_title_label()), { key: "Escape" });
  expect(onCancel).toHaveBeenCalledTimes(1);

  await act(async () => {
    fireEvent.keyDown(field(m.editor_video_title_label()), { key: "Enter" });
  });
  expect(onApplyDirect).toHaveBeenCalledTimes(1);
});

it("does not apply on Enter before a playback address is known", async () => {
  resolve.mockResolvedValue(page(null));
  panel();
  await type(PAGE);
  await act(async () => {
    fireEvent.keyDown(addressInput(), { key: "Enter" });
  });

  expect(onApplyDirect).not.toHaveBeenCalled();
});

it("does not apply a video the panel was closed on while its length was read", async () => {
  let length: (seconds: number | null) => void = () => {};
  vi.mocked(readVideoDuration).mockReturnValue(
    new Promise((done) => (length = done)),
  );
  resolve.mockResolvedValue(file());
  const view = panel();
  await type(FILE);
  await apply();

  view.unmount();
  await act(async () => length(10));
  expect(onApplyDirect).not.toHaveBeenCalled();
});

it.each([
  ["has a video", () => page(FILE), () => m.editor_video_direct_page()],
  ["has no video", () => page(null), () => m.editor_video_direct_page_empty()],
])(
  "says the playback address is being read, then confirmed, when the page %s",
  async (_, found, before) => {
    resolve.mockResolvedValueOnce(found());
    panel();
    await type(PAGE);
    expect(screen.getByRole("status").textContent).toBe(before());

    let answer: (lookup: DirectVideoLookup) => void = () => {};
    resolve.mockReturnValueOnce(new Promise((done) => (answer = done)));
    await type(OWN_FILE, field(m.editor_video_src_label()));
    expect(screen.getByRole("status").textContent).toBe(
      m.editor_video_src_reading(),
    );
    expect(insertButton().hasAttribute("disabled")).toBe(true);

    await act(async () => answer(file(OWN_FILE)));
    expect(screen.getByRole("status").textContent).toBe(
      m.editor_video_src_confirmed(),
    );
    expect(insertButton().hasAttribute("disabled")).toBe(false);
  },
);
