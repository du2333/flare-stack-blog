import type {
  AnyExtension,
  JSONContent,
  MarkdownParseHelpers,
  MarkdownToken,
  MarkdownTokenizer,
} from "@tiptap/core";
import { flattenExtensions, getExtensionField } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import type { marked } from "marked";
import { Marked } from "marked";
import { INLINE_MATH } from "@/features/posts/editor/extensions/math-editing/syntax";
import { createSchemaExtensions } from "@/features/posts/editor/schema";
import type { DirectVideo } from "@/features/posts/utils/video-source";
import {
  directVideoAttrs,
  directVideoOf,
  videoPageUrl,
  videoSourceOf,
} from "@/features/posts/utils/video-source";
import { escapeCodeHtml as escapeHtml } from "@/lib/plain-code-html";

/*
 * The editor schema's Markdown dialect, shared by Markdown paste and the HTTP
 * API. Parsing and serializing are each other's inverse for everything
 * Markdown can carry; the callers decide what to do with the rest.
 */

const BLOCK_MATH = /^ {0,3}\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/;
const BLOCK_MATH_START = /(?:^|\n)(?= {0,3}\$\$)/;

/**
 * What would start a block if it opened a line of a paragraph: an ATX
 * heading, a quote, a list item, or a setext underline or thematic break.
 * Backticks, `*`, `_` and `~` are escaped in all text already.
 */
const BLOCK_START =
  /^( {0,3})(#{1,6}(?=[ \t]|$)|>|[-+](?=[ \t]|$)|\d{1,9}(?=[.)](?:[ \t]|$))|=+[ \t]*$|-+[ \t]*$)/;

/**
 * A Direct Video's line: one `<video …></video>` tag with quoted attributes;
 * `directVideoOfTag` decides which attributes it may have.
 */
const VIDEO_TAG =
  /^ {0,3}<video((?:[ \t]+[a-z][a-z-]*[ \t]*=[ \t]*(?:"[^"\n]*"|'[^'\n]*'))*)[ \t]*>[ \t]*<\/video>[ \t]*(?:\n+|$)/i;
const VIDEO_TAG_ATTRIBUTE =
  /([a-z][a-z-]*)[ \t]*=[ \t]*(?:"([^"\n]*)"|'([^'\n]*)')/gi;
// Marked looks for a block start from the second character of a block, so
// only one after a line break is the start of a line.
const VIDEO_TAG_LINE = /\n(?= {0,3}<video\b)/gi;

/** The attributes a `<video>` line may have, and what each one holds. */
const VIDEO_TAG_ATTRIBUTES: Record<string, keyof DirectVideo> = {
  src: "src",
  poster: "cover",
  title: "title",
  "data-page": "pageUrl",
};

const NAMED_CHARACTERS: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** An attribute value with its character references read. */
function decodeHtml(value: string): string {
  return value.replace(
    /&(?:#(\d{1,7})|#x([\da-f]{1,6})|([a-z]+));/gi,
    (reference, decimal?: string, hex?: string, name?: string) => {
      if (name) return NAMED_CHARACTERS[name.toLowerCase()] ?? reference;
      const code = decimal
        ? Number.parseInt(decimal, 10)
        : Number.parseInt(hex ?? "", 16);
      return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff)
        ? String.fromCodePoint(code)
        : reference;
    },
  );
}

/**
 * The Direct Video a `<video>` tag's attributes name: only the four a
 * Direct Video's line is written with, each once, and a file `directVideoOf`
 * accepts. A poster or page address it does not accept is dropped.
 */
function directVideoOfTag(attributes: string): DirectVideo | null {
  const attrs: Record<string, string> = {};
  for (const [, name, double, single] of attributes.matchAll(
    VIDEO_TAG_ATTRIBUTE,
  )) {
    const key = VIDEO_TAG_ATTRIBUTES[name.toLowerCase()];
    if (!key || key in attrs) return null;
    attrs[key] = decodeHtml(double ?? single);
  }
  return directVideoOf({ ...attrs, provider: "direct" });
}

/** The `<video>` line at the start of `src`, if it is a Direct Video's. */
function videoTagAt(src: string) {
  const match = VIDEO_TAG.exec(src);
  const video = match ? directVideoOfTag(match[1]) : null;
  return match && video ? { raw: match[0], video } : null;
}

/** A Direct Video as its line. Its length is the file's, so is not written. */
function videoTag(video: DirectVideo): string {
  const attributes = [
    `src="${escapeHtml(video.src)}"`,
    video.cover && `poster="${escapeHtml(video.cover)}"`,
    video.title && `title="${escapeHtml(video.title)}"`,
    video.pageUrl && `data-page="${escapeHtml(video.pageUrl)}"`,
  ].filter(Boolean);
  return `<video ${attributes.join(" ")}></video>`;
}

const videoTagTokenizer: MarkdownTokenizer = {
  name: "video",
  level: "block",
  // A `<video>` line ends the paragraph above it only when it is a Direct
  // Video's, so other HTML stays in its paragraph as it did.
  start: (src) => {
    for (const match of src.matchAll(VIDEO_TAG_LINE)) {
      const index = match.index + match[0].length;
      if (videoTagAt(src.slice(index))) return index;
    }
    return -1;
  },
  tokenize: (src) => {
    const line = videoTagAt(src);
    if (!line) return undefined;
    return { type: "video", raw: line.raw, video: line.video };
  },
};

const inlineMathTokenizer: MarkdownTokenizer = {
  name: "inlineMath",
  level: "inline",
  start: (src) => src.indexOf("$"),
  tokenize: (src) => {
    // `$$` inside a paragraph is not math; take the whole run as text so its
    // second `$` cannot open inline math.
    const dollars = /^\$\$[^$]*\$\$|^\$\$+/.exec(src);
    if (dollars) return { type: "text", raw: dollars[0], text: dollars[0] };

    const match = INLINE_MATH.exec(src);
    if (!match) return undefined;
    return { type: "inlineMath", raw: match[0], latex: match[1] };
  },
};

const blockMathTokenizer: MarkdownTokenizer = {
  name: "blockMath",
  level: "block",
  // Only a `$$` at the start of a line opens block math.
  start: (src) => {
    const match = BLOCK_MATH_START.exec(src);
    if (!match) return -1;
    return match.index + match[0].length;
  },
  tokenize: (src) => {
    const match = BLOCK_MATH.exec(src);
    if (!match) return undefined;
    return { type: "blockMath", raw: match[0], latex: match[1].trim() };
  },
};

/**
 * The editor has no task list, so `- [ ] item` keeps its marker as text
 * inside a plain list item.
 */
function withLiteralTaskMarker(token: MarkdownToken): MarkdownToken {
  if (token.type !== "list_item" || !token.task) return token;

  const marker = `[${token.checked ? "x" : " "}] `;
  const markerToken = { type: "text", raw: marker, text: marker };
  const [first, ...rest] = (token.tokens ?? []).filter(
    (child) => child.type !== "checkbox",
  );
  const tokens =
    first && (first.type === "text" || first.type === "paragraph")
      ? [
          {
            ...first,
            text: marker + (first.text ?? ""),
            tokens: [markerToken, ...(first.tokens ?? [])],
          },
          ...rest,
        ]
      : [markerToken, ...(first ? [first, ...rest] : [])];

  return {
    ...token,
    task: false,
    text: marker + (token.text ?? ""),
    tokens,
  };
}

/** Escapes what would turn a line of a paragraph into another block. */
function escapeBlockStarts(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) =>
      line.replace(BLOCK_START, (_, indent: string, marker: string) =>
        /^\d/.test(marker) ? `${indent}${marker}\\` : `${indent}\\${marker}`,
      ),
    )
    .join("\n");
}

/** A fence longer than any run of backticks in `code`. */
function codeFence(code: string): string {
  const longest = Math.max(
    0,
    ...(code.match(/`+/g) ?? []).map((run) => run.length),
  );
  return "`".repeat(Math.max(3, longest + 1));
}

function imageDestination(src: string): string {
  return /[\s()<>]/.test(src)
    ? `<${src.replace(/[<>]/g, (char) => encodeURIComponent(char))}>`
    : src;
}

/**
 * Marks a parsed link that was an autolink, a bare address or one in `<>`,
 * so `parseMarkdown` can tell it from `[text](address)` showing the same
 * text. `parseMarkdown` removes it.
 */
export const AUTOLINK_FLAG = "autolink";

const markdownOverrides: Record<
  string,
  (extension: AnyExtension) => AnyExtension
> = {
  link: (extension) =>
    extension.extend({
      parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) =>
        helpers.applyMark("link", helpers.parseInline(token.tokens ?? []), {
          href: token.href,
          title: token.title || null,
          ...(token.raw && !token.raw.startsWith("[")
            ? { [AUTOLINK_FLAG]: true }
            : {}),
        }),
    }),
  inlineMath: (extension) =>
    extension.extend({
      markdownTokenizer: inlineMathTokenizer,
      parseMarkdown: (token: MarkdownToken) => ({
        type: "inlineMath",
        attrs: { latex: token.latex },
      }),
      renderMarkdown: (node: JSONContent) => `$${node.attrs?.latex ?? ""}$`,
    }),
  blockMath: (extension) =>
    extension.extend({
      markdownTokenizer: blockMathTokenizer,
      parseMarkdown: (token: MarkdownToken) => ({
        type: "blockMath",
        attrs: { latex: token.latex },
      }),
      renderMarkdown: (node: JSONContent) =>
        `$$\n${node.attrs?.latex ?? ""}\n$$`,
    }),
  listItem: (extension) =>
    extension.extend({
      parseMarkdown(token, helpers) {
        return this.parent?.(withLiteralTaskMarker(token), helpers) ?? [];
      },
    }),
  paragraph: (extension) =>
    extension.extend({
      renderMarkdown(node, helpers, context) {
        return escapeBlockStarts(this.parent?.(node, helpers, context) ?? "");
      },
    }),
  codeBlock: (extension) =>
    extension.extend({
      renderMarkdown: (node: JSONContent) => {
        const code = (node.content ?? [])
          .map((child) => child.text ?? "")
          .join("");
        const fence = codeFence(code);
        return `${fence}${node.attrs?.language ?? ""}\n${code}\n${fence}`;
      },
    }),
  image: (extension) =>
    extension.extend({
      renderMarkdown: (node: JSONContent) => {
        const alt = String(node.attrs?.alt ?? "").replace(/[\\[\]]/g, "\\$&");
        const src = imageDestination(String(node.attrs?.src ?? ""));
        const title = node.attrs?.title
          ? ` "${String(node.attrs.title).replace(/["\\]/g, "\\$&")}"`
          : "";
        return `![${alt}](${src}${title})`;
      },
    }),
  // A provider's video is its page link alone on a line, and a Direct Video
  // its `<video>` line; a block that names no video has nothing to write.
  video: (extension) =>
    extension.extend({
      markdownTokenizer: videoTagTokenizer,
      parseMarkdown: (token: MarkdownToken) => ({
        type: "video",
        attrs: directVideoAttrs(token.video),
      }),
      renderMarkdown: (node: JSONContent) => {
        const source = videoSourceOf(node.attrs);
        if (source) return videoPageUrl(source);
        const direct = directVideoOf(node.attrs);
        return direct ? videoTag(direct) : "";
      },
    }),
};

function createMarkdownExtensions(): Array<AnyExtension> {
  return flattenExtensions(createSchemaExtensions()).map((extension) => {
    // MarkdownManager flattens again; a parent would re-add its children
    // without the overrides.
    const flat = getExtensionField(extension, "addExtensions")
      ? extension.extend({ addExtensions: () => [] })
      : extension;
    return markdownOverrides[flat.name]?.(flat) ?? flat;
  });
}

function createMarked() {
  const marked = new Marked();
  marked.use({
    tokenizer: {
      // There are no footnotes; keep `[^1]: note` as text instead of letting
      // it vanish as a link reference definition.
      def(src) {
        return /^ {0,3}\[\^/.test(src) ? undefined : false;
      },
    },
  });
  return marked;
}

let manager: MarkdownManager | undefined;

export function getMarkdownManager() {
  manager ??= new MarkdownManager({
    // An own instance keeps the tokenizers off the shared `marked` singleton.
    marked: createMarked() as unknown as typeof marked,
    extensions: createMarkdownExtensions(),
  });
  return manager;
}
