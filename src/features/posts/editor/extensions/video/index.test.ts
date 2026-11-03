// @vitest-environment jsdom
import type { Editor, JSONContent } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { Editor as HeadlessEditor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, expect, it, vi } from "vitest";
import {
  directVideoAttrs,
  directVideoOf,
} from "@/features/posts/utils/video-source";
import { createPostEditor } from "@/features/posts/editor/test-utils";
import type { VideoEditingOptions } from ".";
import { getDirectVideoResolver, getVideoEditor, VideoEditing } from ".";

const BILIBILI = "https://www.bilibili.com/video/BV1fK4y1s7Qf/?p=2";
const SOURCE = {
  provider: "bilibili",
  videoId: "BV1fK4y1s7Qf",
  page: 2,
  start: null,
} as const;

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

/** An editor with the cursor at `pos`, or at the end of the document. */
function open(content = "<p></p>", pos?: number) {
  editor = createPostEditor({ content });
  if (pos === undefined) editor.commands.focus("end");
  else editor.commands.setTextSelection(pos);
  return editor;
}

/** The document as nested node names, with text and video IDs in quotes. */
function outline(target: Editor) {
  const describe = (node: JSONContent): string => {
    if (node.type === "text") {
      const link = node.marks?.some((mark) => mark.type === "link");
      return (link ? "link:" : "") + JSON.stringify(node.text);
    }
    if (node.type === "video") {
      return `video(${JSON.stringify(node.attrs?.videoId ?? null)})`;
    }
    const children = (node.content ?? []).map(describe).join(" ");
    return children ? `${node.type}(${children})` : (node.type ?? "");
  };
  return (target.getJSON().content ?? []).map(describe);
}

function paste(target: Editor, text: string) {
  const event = {
    clipboardData: {
      getData: (type: string) => (type === "text/plain" ? text : ""),
      types: ["text/plain"],
      files: [],
    },
  } as unknown as ClipboardEvent;
  return target.view.someProp("handlePaste", (handle) =>
    handle(target.view, event, Slice.empty),
  );
}

it("inserts an empty video in place of an empty line and opens it", () => {
  const target = open("<p>a</p><p></p><p>b</p>", 4);
  expect(target.commands.insertVideo()).toBe(true);

  expect(outline(target)).toEqual([
    'paragraph("a")',
    "video(null)",
    'paragraph("b")',
  ]);
  expect(getVideoEditor(target)).toMatchObject({ pos: 3, inserted: true });
});

it("fills the open video and selects it", () => {
  const target = open();
  target.commands.insertVideo();
  target.commands.applyVideo(SOURCE);

  expect(getVideoEditor(target)).toBeNull();
  expect(target.getJSON().content?.[0]).toEqual({
    type: "video",
    attrs: {
      ...SOURCE,
      title: null,
      cover: null,
      duration: null,
      src: null,
      pageUrl: null,
    },
  });
  expect(target.state.selection.from).toBe(0);
});

it("gives the empty line back when a new video is cancelled", () => {
  const target = open("<p>a</p><p></p><p>b</p>", 4);
  target.commands.insertVideo();
  target.commands.closeVideoEditor();

  expect(getVideoEditor(target)).toBeNull();
  expect(outline(target)).toEqual([
    'paragraph("a")',
    "paragraph",
    'paragraph("b")',
  ]);
});

it("keeps an existing video when its editing is cancelled", () => {
  const target = open();
  target.commands.insertVideo();
  target.commands.applyVideo(SOURCE);
  expect(target.commands.openVideoEditor(0)).toBe(true);
  target.commands.closeVideoEditor();

  expect(outline(target)[0]).toBe('video("BV1fK4y1s7Qf")');
});

it("does not open in a read-only editor", () => {
  editor = createPostEditor({ editable: false });
  expect(editor.commands.insertVideo()).toBe(false);
});

it("turns a video link pasted on an empty line into a video, undone back to the link", () => {
  const target = open("<p>a</p><p></p>", 4);
  expect(paste(target, BILIBILI)).toBe(true);
  expect(outline(target)).toEqual([
    'paragraph("a")',
    'video("BV1fK4y1s7Qf")',
    "paragraph",
  ]);
  expect(target.getJSON().content?.[1].attrs).toMatchObject(SOURCE);

  target.commands.undo();
  expect(outline(target)).toEqual([
    'paragraph("a")',
    `paragraph(link:${JSON.stringify(BILIBILI)})`,
  ]);
});

it("keeps a video link pasted mid-sentence as a link", () => {
  const target = open("<p>see</p>");
  paste(target, BILIBILI);
  expect(outline(target)).toEqual([
    `paragraph("see" link:${JSON.stringify(BILIBILI)})`,
  ]);
});

it("turns pasted embed code into a video anywhere outside code", () => {
  const target = open("<p>see</p>");
  expect(
    paste(
      target,
      '<iframe src="//player.bilibili.com/player.html?bvid=BV1fK4y1s7Qf&p=2" allowfullscreen="true"></iframe>',
    ),
  ).toBe(true);
  expect(outline(target)).toEqual([
    'paragraph("see")',
    'video("BV1fK4y1s7Qf")',
    "paragraph",
  ]);
});

it("leaves links it cannot embed, and pastes inside code, as text", () => {
  const target = open();
  paste(target, "https://vimeo.com/76979871");
  expect(outline(target).some((line) => line.startsWith("video"))).toBe(false);

  const code = open("<pre><code>x</code></pre>", 2);
  paste(code, BILIBILI);
  expect(outline(code).some((line) => line.startsWith("video"))).toBe(false);
});

/** An editor with only paragraphs and videos, looking metadata up with `fetchMeta`. */
function withMeta(
  fetchMeta: VideoEditingOptions["fetchMeta"],
  content: JSONContent | string = "<p></p>",
  editable = true,
) {
  editor = new HeadlessEditor({
    element: document.createElement("div"),
    extensions: [StarterKit, VideoEditing.configure({ fetchMeta })],
    content,
    editable,
  });
  return editor;
}

const META = {
  title: "稻葉曇『ラグトレイン』",
  cover: "https://i2.hdslb.com/bfs/archive/a.jpg",
  duration: 348,
};

it("fills in a new Bilibili video's metadata, outside the undo history", async () => {
  const fetchMeta = vi.fn(async () => META);
  const target = withMeta(fetchMeta);
  target.commands.insertVideo();
  target.commands.applyVideo(SOURCE);

  await vi.waitFor(() =>
    expect(target.getJSON().content?.[0].attrs).toEqual({
      ...SOURCE,
      ...META,
      src: null,
      pageUrl: null,
    }),
  );
  expect(fetchMeta).toHaveBeenCalledExactlyOnceWith(SOURCE);
  target.commands.undo();
  expect(target.getJSON().content?.[0].type).toBe("paragraph");
});

it("asks once per video across every editor using the same lookup, and not in a read-only editor", async () => {
  const fetchMeta = vi.fn(async () => null);
  const content = {
    type: "doc",
    content: [
      { type: "video", attrs: SOURCE },
      { type: "video", attrs: SOURCE },
    ],
  };
  const first = withMeta(fetchMeta, content);
  first.commands.insertContent("<p>x</p>");
  const second = new HeadlessEditor({
    element: document.createElement("div"),
    extensions: [StarterKit, VideoEditing.configure({ fetchMeta })],
    content,
  });
  await vi.waitFor(() => expect(fetchMeta).toHaveBeenCalledTimes(1));
  second.destroy();
  first.destroy();

  const readOnly = vi.fn(async () => META);
  withMeta(readOnly, content, false);
  expect(readOnly).not.toHaveBeenCalled();
});

it("forgets the old metadata when the link is changed to another video", () => {
  const target = withMeta(undefined, {
    type: "doc",
    content: [{ type: "video", attrs: { ...SOURCE, ...META } }],
  });
  target.commands.openVideoEditor(0);
  target.commands.applyVideo({
    ...SOURCE,
    videoId: "BV1xx411c7mD",
    page: null,
  });
  expect(target.getJSON().content?.[0].attrs).toMatchObject({
    videoId: "BV1xx411c7mD",
    title: null,
    cover: null,
    duration: null,
  });
});

const DIRECT = {
  src: "https://cdn.example.com/clip.mp4",
  pageUrl: "https://example.com/watch/1",
  title: "A clip",
  cover: "https://example.com/cover.jpg",
  duration: 95,
};

it("writes a Direct Video into the open block, selecting it", () => {
  const target = open();
  target.commands.insertVideo();
  target.commands.applyDirectVideo(DIRECT);

  expect(getVideoEditor(target)).toBeNull();
  expect(target.getJSON().content?.[0]).toEqual({
    type: "video",
    attrs: directVideoAttrs(DIRECT),
  });
  expect(directVideoOf(target.getJSON().content?.[0].attrs)).toEqual(DIRECT);
  expect(target.state.selection.from).toBe(0);
});

it("keeps a Direct Video when its editing is cancelled, and removes one never filled", () => {
  const target = open();
  target.commands.insertVideo();
  target.commands.applyDirectVideo(DIRECT);
  target.commands.openVideoEditor(0);
  target.commands.closeVideoEditor();
  expect(target.getJSON().content?.[0].attrs).toMatchObject({
    provider: "direct",
    src: DIRECT.src,
  });

  const fresh = open();
  fresh.commands.insertVideo();
  fresh.commands.closeVideoEditor();
  expect(outline(fresh).some((line) => line.startsWith("video"))).toBe(false);
});

it("does not apply a Direct Video when no block is open", () => {
  const target = open();
  expect(target.commands.applyDirectVideo(DIRECT)).toBe(false);
});

it("clears a Bilibili video's parts when the block becomes a Direct Video", () => {
  const target = open();
  target.commands.insertVideo();
  target.commands.applyVideo(SOURCE);
  target.commands.openVideoEditor(0);
  target.commands.applyDirectVideo({ ...DIRECT, title: null, cover: null });

  expect(target.getJSON().content?.[0].attrs).toEqual(
    directVideoAttrs({ ...DIRECT, title: null, cover: null }),
  );
  expect(target.getJSON().content?.[0].attrs).toMatchObject({
    videoId: null,
    page: null,
    start: null,
  });
});

it("clears a Direct Video's address, page and metadata when the block becomes Bilibili or YouTube", () => {
  const target = open();
  target.commands.insertVideo();
  target.commands.applyDirectVideo(DIRECT);
  target.commands.openVideoEditor(0);
  target.commands.applyVideo(SOURCE);

  expect(target.getJSON().content?.[0].attrs).toEqual({
    ...SOURCE,
    title: null,
    cover: null,
    duration: null,
    src: null,
    pageUrl: null,
  });
});

it("hands the lookup it was configured with to the panel", () => {
  const resolveDirectVideo = vi.fn();
  const target = new HeadlessEditor({
    element: document.createElement("div"),
    extensions: [StarterKit, VideoEditing.configure({ resolveDirectVideo })],
  });
  editor = target;
  expect(getDirectVideoResolver(target)).toBe(resolveDirectVideo);
  const unconfigured = new HeadlessEditor({
    element: document.createElement("div"),
    extensions: [StarterKit, VideoEditing],
  });
  expect(getDirectVideoResolver(unconfigured)).toBeUndefined();
  unconfigured.destroy();
});

it("never looks metadata up for a Direct Video", async () => {
  const fetchMeta = vi.fn(async () => META);
  const target = withMeta(fetchMeta, {
    type: "doc",
    content: [
      {
        type: "video",
        attrs: directVideoAttrs({ ...DIRECT, title: null, cover: null }),
      },
    ],
  });
  await new Promise((done) => setTimeout(done, 20));

  expect(fetchMeta).not.toHaveBeenCalled();
  expect(target.getJSON().content?.[0].attrs).toMatchObject({
    provider: "direct",
    title: null,
  });
});
