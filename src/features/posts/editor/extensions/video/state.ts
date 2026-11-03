import type { Editor } from "@tiptap/core";
import type { Step } from "@tiptap/pm/transform";
import { createInPlaceEditing, useInPlaceEditing } from "../in-place-editing";
import { mapSteps } from "../insertion";
import type { ResolveDirectVideo } from "./use-direct-video-lookup";

export const VIDEO = "video";

/** The video block open for editing. */
export interface VideoEditorState {
  /** Where the video node is. */
  pos: number;
  /** Whether it was just inserted; cancelling takes the insertion back then. */
  inserted: boolean;
  /**
   * The steps that take the insertion back, giving back the empty line it
   * replaced: empty unless `inserted`.
   */
  revert: readonly Step[];
}

/** The video open for editing, following it; closed once it is gone. */
export const videoEditor = createInPlaceEditing<VideoEditorState>(
  "videoEditing",
  (open, tr) => {
    const mapped = tr.mapping.mapResult(open.pos, 1);
    if (mapped.deletedAfter || tr.doc.nodeAt(mapped.pos)?.type.name !== VIDEO) {
      return null;
    }
    if (mapped.pos === open.pos && open.revert.length === 0) return open;
    return {
      ...open,
      pos: mapped.pos,
      revert: mapSteps(open.revert, tr.mapping),
    };
  },
);

/** The video open for editing, or `null` when none is. */
export function getVideoEditor(editor: Editor): VideoEditorState | null {
  return videoEditor.get(editor.state);
}

/** The video open for editing, re-rendering as it opens, moves or closes. */
export function useVideoEditor(editor: Editor | null) {
  return useInPlaceEditing(editor, videoEditor);
}

/**
 * The lookup the editor was configured with for Direct Video addresses, or
 * `undefined` when it has none (a read-only view), which fetches nothing.
 */
export function getDirectVideoResolver(
  editor: Editor,
): ResolveDirectVideo | undefined {
  return editor.extensionManager.extensions.find(
    (extension) => extension.name === "videoEditing",
  )?.options.resolveDirectVideo;
}
