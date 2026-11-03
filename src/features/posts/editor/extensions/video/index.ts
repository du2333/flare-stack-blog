import type { Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import { Transform } from "@tiptap/pm/transform";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { schemaVideo } from "@/features/posts/editor/schema";
import type {
  DirectVideo,
  DirectVideoLookup,
  VideoMeta,
  VideoSource,
} from "@/features/posts/utils/video-source";
import {
  directVideoAttrs,
  EMPTY_VIDEO_META,
  parseVideoInput,
  videoMetaOf,
  videoSourceOf,
} from "@/features/posts/utils/video-source";
import { findNode, revertSteps } from "../insertion";
import { VIDEO, videoEditor } from "./state";
import { VideoView } from "./video-view";

export type { VideoEditorState } from "./state";
export {
  getDirectVideoResolver,
  getVideoEditor,
  useVideoEditor,
} from "./state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEditing: {
      /**
       * Inserts an empty video block in place of an empty line, or else at
       * the selection, and opens it for a link.
       */
      insertVideo: () => ReturnType;
      /** Opens the video at `pos` for editing. */
      openVideoEditor: (pos: number) => ReturnType;
      /** Points the open video at `source` and closes the editing. */
      applyVideo: (source: VideoSource) => ReturnType;
      /** Points the open video at a Direct Video and closes the editing. */
      applyDirectVideo: (video: DirectVideo) => ReturnType;
      /**
       * Closes the editing without changing the video, or removes it when it
       * was just inserted and never filled.
       */
      closeVideoEditor: () => ReturnType;
    };
  }
}

function focusSoon(editor: Editor) {
  // After the editing UI unmounts, as Tiptap's focus command does.
  requestAnimationFrame(() => {
    if (!editor.isDestroyed) editor.view.focus();
  });
}

const EditorVideo = schemaVideo.extend({
  selectable: true,
  draggable: false,

  addNodeView() {
    return ReactNodeViewRenderer(VideoView, {
      // The in-place editing panel handles its own events.
      stopEvent: ({ event }) =>
        event.target instanceof Element &&
        event.target.closest("[data-video-editor]") !== null,
    });
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        if (
          !(selection instanceof NodeSelection) ||
          selection.node.type.name !== VIDEO
        ) {
          return false;
        }
        return editor.commands.openVideoEditor(selection.from);
      },
    };
  },
});

/**
 * Embedded videos, edited in place: inserting one from the toolbar or slash
 * menu, clicking one, or Enter on a selected one opens a link input inside
 * the block. Pasting a video link on an empty line, or a provider's embed
 * code anywhere outside code, makes a video block; undoing that once gives
 * the pasted link back as text. Never opens in a read-only editor.
 */
export interface VideoEditingOptions {
  /**
   * Looks up a video's title, cover and length. The editor asks once for
   * each embedded video that has none yet, and fills them in without an
   * undo step of their own.
   */
  fetchMeta?: (source: VideoSource) => Promise<VideoMeta | null>;
  /**
   * Finds out what is at an address the Admin gave for a Direct Video: a
   * video file, or a page that may name one. Without it the panel fetches
   * nothing and the Admin fills a Direct Video in by hand.
   */
  resolveDirectVideo?: (url: string) => Promise<DirectVideoLookup>;
}

/** Whether `node` is the video `source`, part included. */
function isVideo(node: PMNode, source: VideoSource) {
  const own = videoSourceOf(node.attrs);
  return (
    own?.provider === source.provider &&
    own.videoId === source.videoId &&
    own.page === source.page
  );
}

/** Fills `meta` into each video of `source` that has none. */
function fillMeta(view: EditorView, source: VideoSource, meta: VideoMeta) {
  const tr = view.state.tr;
  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== VIDEO) return true;
    const own = videoMetaOf(node.attrs);
    if (isVideo(node, source) && !own.title && !own.cover) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...meta });
    }
    return false;
  });
  if (tr.docChanged) view.dispatch(tr.setMeta("addToHistory", false));
}

/**
/**
 * The videos each `fetchMeta` was already asked about, shared by every editor
 * that uses it: the post editor page runs more than one, and each would
 * otherwise ask again.
 */
const askedBy = new WeakMap<object, Set<string>>();

/**
 * A plugin that looks up metadata for videos that have none: new ones, and
 * ones embedded while the provider could not be reached. Each video is
 * asked about once per page load.
 */
function videoMetaPlugin(
  editor: Editor,
  fetchMeta: NonNullable<VideoEditingOptions["fetchMeta"]>,
) {
  return new Plugin({
    key: new PluginKey("videoMeta"),
    view: (view) => {
      let asked = askedBy.get(fetchMeta);
      if (!asked) askedBy.set(fetchMeta, (asked = new Set()));
      let destroyed = false;
      const scan = () => {
        if (!editor.isEditable) return;
        view.state.doc.descendants((node) => {
          if (node.type.name !== VIDEO) return true;
          const source = videoSourceOf(node.attrs);
          const meta = videoMetaOf(node.attrs);
          if (!source) return false;
          if (meta.title || meta.cover) return false;
          const key = `${source.provider}:${source.videoId}:${source.page ?? 1}`;
          if (asked.has(key)) return false;
          asked.add(key);
          void fetchMeta(source).then((found) => {
            if (!destroyed && found) fillMeta(view, source, found);
          });
          return false;
        });
      };
      scan();
      return {
        update: (_view, previous) => {
          if (view.state.doc !== previous.doc) scan();
        },
        destroy: () => {
          destroyed = true;
        },
      };
    },
  });
}

export const VideoEditing = Extension.create<VideoEditingOptions>({
  name: "videoEditing",

  // Runs before Markdown paste, which would keep a link as text.
  priority: 210,

  addOptions() {
    return { fetchMeta: undefined, resolveDirectVideo: undefined };
  },

  addExtensions() {
    return [EditorVideo];
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const { fetchMeta } = this.options;
    return [
      videoEditor.plugin(),
      ...(fetchMeta ? [videoMetaPlugin(editor, fetchMeta)] : []),
      new Plugin({
        key: new PluginKey("videoPaste"),
        props: {
          handlePaste: (view, event) => {
            if (!editor.isEditable) return false;
            const text = event.clipboardData?.getData("text/plain");
            const { selection, schema } = view.state;
            const { $from } = selection;
            if (!text || $from.parent.type.spec.code) return false;
            const input = parseVideoInput(text);
            if (input.kind !== "video") return false;

            const video = schema.nodes[VIDEO].create(input.source);
            const onEmptyLine =
              selection.empty &&
              $from.parent.type.name === "paragraph" &&
              $from.parent.content.size === 0;

            if (/<iframe/i.test(text)) {
              const tr = view.state.tr;
              if (onEmptyLine) {
                tr.replaceWith($from.before(), $from.after(), video);
              } else {
                tr.replaceSelectionWith(video, false);
              }
              const pos = findNode(tr, video);
              if (pos >= 0) tr.setSelection(NodeSelection.create(tr.doc, pos));
              view.dispatch(
                tr
                  .scrollIntoView()
                  .setMeta("paste", true)
                  .setMeta("uiEvent", "paste"),
              );
              return true;
            }

            // A link mid-sentence stays a link.
            if (!onEmptyLine) return false;

            // Paste the link as text first, then make it a video in a step
            // of its own, so one undo turns the video back into the link.
            const link = text.trim();
            const linkMark = schema.marks.link?.create({ href: link });
            const lineStart = $from.before();
            view.dispatch(
              view.state.tr
                .replaceSelectionWith(
                  schema.text(link, linkMark ? [linkMark] : []),
                  false,
                )
                .setMeta("paste", true)
                .setMeta("uiEvent", "paste"),
            );
            const line = view.state.doc.nodeAt(lineStart);
            if (!line) return true;
            const tr = closeHistory(view.state.tr);
            tr.replaceWith(lineStart, lineStart + line.nodeSize, video);
            tr.setSelection(NodeSelection.create(tr.doc, lineStart));
            view.dispatch(tr.scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertVideo:
        () =>
        ({ editor, tr, dispatch }) => {
          const nodeType = tr.doc.type.schema.nodes[VIDEO];
          if (!editor.isEditable || !nodeType) return false;
          if (!dispatch) return true;

          const start = tr.steps.length;
          const { empty, $from } = tr.selection;
          const node = nodeType.create();
          const host = $from.depth > 0 ? $from.node(-1) : null;
          const replacesEmptyLine =
            empty &&
            $from.parent.isTextblock &&
            $from.parent.content.size === 0 &&
            host?.canReplaceWith(
              $from.index(-1),
              $from.indexAfter(-1),
              nodeType,
            );
          if (replacesEmptyLine) {
            tr.replaceWith($from.before(), $from.after(), node);
          } else {
            tr.replaceSelectionWith(node, false);
          }

          const pos = findNode(tr, node);
          if (pos < 0) return false;
          tr.setSelection(NodeSelection.create(tr.doc, pos));
          videoEditor.open(tr, {
            pos,
            inserted: true,
            revert: revertSteps(tr, start),
          });
          return true;
        },
      openVideoEditor:
        (pos) =>
        ({ editor, state, tr, dispatch }) => {
          if (!editor.isEditable || tr.doc.nodeAt(pos)?.type.name !== VIDEO) {
            return false;
          }
          // Clicking the open video again keeps its editing as it is.
          if (dispatch && videoEditor.get(state)?.pos !== pos) {
            videoEditor.open(tr, { pos, inserted: false, revert: [] });
          }
          return true;
        },
      applyVideo:
        (source) =>
        ({ editor, state, tr, dispatch }) => {
          const open = videoEditor.get(state);
          if (!open) return false;
          if (!dispatch) return true;
          videoEditor.close(tr);
          const node = tr.doc.nodeAt(open.pos);
          if (node?.type.name !== VIDEO) return true;
          // Another video's title and cover would be wrong; look them up anew.
          // A block that was a Direct Video gives up its file and page.
          tr.setNodeMarkup(open.pos, undefined, {
            ...(isVideo(node, source)
              ? videoMetaOf(node.attrs)
              : EMPTY_VIDEO_META),
            ...source,
            src: null,
            pageUrl: null,
          });
          tr.setSelection(NodeSelection.create(tr.doc, open.pos));
          focusSoon(editor);
          return true;
        },
      applyDirectVideo:
        (video) =>
        ({ editor, state, tr, dispatch }) => {
          const open = videoEditor.get(state);
          if (!open) return false;
          if (!dispatch) return true;
          videoEditor.close(tr);
          const node = tr.doc.nodeAt(open.pos);
          if (node?.type.name !== VIDEO) return true;
          // `directVideoAttrs` names every attribute, so what the block was
          // before (a Bilibili ID, its cover) cannot linger.
          tr.setNodeMarkup(open.pos, undefined, directVideoAttrs(video));
          tr.setSelection(NodeSelection.create(tr.doc, open.pos));
          focusSoon(editor);
          return true;
        },
      closeVideoEditor:
        () =>
        ({ state, tr, dispatch }) => {
          const open = videoEditor.get(state);
          if (!open) return false;
          if (!dispatch) return true;
          videoEditor.close(tr);
          const node = tr.doc.nodeAt(open.pos);
          if (node?.type.name !== VIDEO) return true;
          if (!open.inserted || videoSourceOf(node.attrs)) return true;
          // Give back the line the video replaced, or else just remove it.
          const reverted = new Transform(tr.doc);
          const restored =
            open.revert.length > 0 &&
            open.revert.every((step) => !reverted.maybeStep(step).failed);
          if (restored) {
            for (const step of reverted.steps) tr.step(step);
          } else {
            tr.delete(open.pos, open.pos + node.nodeSize);
          }
          return true;
        },
    };
  },
});
