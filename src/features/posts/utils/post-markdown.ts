import type { JSONContent } from "@tiptap/core";
import { parseMarkdown } from "@/features/posts/editor/markdown/parse-markdown";
import { serializeMarkdown } from "@/features/posts/editor/markdown/serialize-markdown";
import { parseVideoInput } from "@/features/posts/utils/video-source";

/*
 * Post content as the HTTP API exchanges it in Markdown (ADR 0032): parsed
 * like a paste, except that a video's bare address alone on a line is a
 * video block (`[text](address)` stays a link), and an image must be one the
 * server can show.
 */

const MEDIA_PATH = /^\/images\/[^/?#\s]+(?:\?\S*)?$/;

/** A web address, or the path of an uploaded **Media** item. */
export function isPostMarkdownImage(src: string): boolean {
  if (MEDIA_PATH.test(src)) return true;
  if (!/^https?:\/\//i.test(src)) return false;
  try {
    new URL(src);
    return true;
  } catch {
    return false;
  }
}

/** The video a bare address alone in a paragraph names. */
function videoOfLine(text: string): JSONContent | null {
  const input = parseVideoInput(text);
  return input.kind === "video"
    ? {
        type: "video",
        attrs: {
          ...input.source,
          title: null,
          cover: null,
          duration: null,
          src: null,
          pageUrl: null,
        },
      }
    : null;
}

export interface PostMarkdownContent {
  contentJson: JSONContent;
  /** Images that are neither web addresses nor Media paths. */
  refusedImages: Array<string>;
}

export function postContentFromMarkdown(markdown: string): PostMarkdownContent {
  const { content, refusedImages } = parseMarkdown(markdown, {
    acceptsImage: isPostMarkdownImage,
    headings: "keep",
    autolinkLine: videoOfLine,
  });
  return {
    contentJson: {
      type: "doc",
      content: content.length > 0 ? content : [{ type: "paragraph" }],
    },
    refusedImages,
  };
}

export function postContentToMarkdown(
  contentJson: JSONContent | null,
): string | null {
  // A body with nothing to write, such as one empty paragraph, is no body.
  return (contentJson && serializeMarkdown(contentJson)) || null;
}
