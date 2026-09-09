import type { JSONContent } from "@tiptap/react";
import {
  codeBlockHighlightKey,
  snapshotHighlightedHtmlByKey,
} from "@/features/posts/utils/apply-code-block-highlighting";

export const EDITOR_CODE_HIGHLIGHT_MAX_CHARS = 50_000;
export const EDITOR_CODE_HIGHLIGHT_MAX_LINES = 500;

const htmlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | undefined>>();

export function isEditorCodeHighlightTooLarge(code: string) {
  if (code.length > EDITOR_CODE_HIGHLIGHT_MAX_CHARS) return true;
  let lines = 1;
  for (let i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      lines += 1;
      if (lines > EDITOR_CODE_HIGHLIGHT_MAX_LINES) return true;
    }
  }
  return false;
}

export function snapshotHtmlByKey(doc: JSONContent | null | undefined) {
  return snapshotHighlightedHtmlByKey(doc);
}

export function resolveEditorCodeHighlightHtml(
  language: string,
  code: string,
  snapshotHtml: Map<string, string>,
) {
  if (isEditorCodeHighlightTooLarge(code)) return undefined;
  const key = codeBlockHighlightKey(language, code);
  return snapshotHtml.get(key) ?? htmlCache.get(key);
}

export function requestEditorCodeHighlight(language: string, code: string) {
  if (isEditorCodeHighlightTooLarge(code)) {
    return Promise.resolve(undefined);
  }

  const key = codeBlockHighlightKey(language, code);
  const cached = htmlCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = import("@/lib/shiki")
    .then(({ highlight }) => highlight(code, language))
    .then((html) => {
      htmlCache.set(key, html);
      return html;
    })
    .catch((error) => {
      console.warn(
        JSON.stringify({
          event: "editor_code_highlight_failed",
          lang: language,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return undefined;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, task);
  return task;
}

export function scheduleIdle(fn: () => void) {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(fn);
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 0);
  return () => clearTimeout(id);
}

export function textOffsetFromPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number,
) {
  let range: Range | null = null;
  if (typeof document.caretRangeFromPoint === "function") {
    range = document.caretRangeFromPoint(clientX, clientY);
  } else if (typeof document.caretPositionFromPoint === "function") {
    const position = document.caretPositionFromPoint(clientX, clientY);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
    }
  }
  if (!range || !root.contains(range.startContainer)) return null;

  const prefix = document.createRange();
  prefix.selectNodeContents(root);
  prefix.setEnd(range.startContainer, range.startOffset);
  return prefix.toString().length;
}

export function codeBlockTextPos(
  blockPos: number,
  offset: number,
  codeLength: number,
) {
  const clamped = Math.max(0, Math.min(codeLength, offset));
  return blockPos + 1 + clamped;
}

export function isTextSelectionInsideCodeBlock(
  from: number,
  to: number,
  blockPos: number,
  blockSize: number,
) {
  return from >= blockPos + 1 && to <= blockPos + blockSize - 1;
}
