import type { AnyExtension } from "@tiptap/core";
import { mergeAttributes, Node } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { TableBlockExtension } from "@/features/posts/editor/extensions/table";
import { BlockQuoteExtension } from "@/features/posts/editor/extensions/typography/block-quote";
import { HeadingExtension } from "@/features/posts/editor/extensions/typography/heading";

const schemaCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      highlightedHtml: {
        default: null,
        rendered: false,
      },
    };
  },
});

const schemaImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      uploadId: {
        default: null,
        rendered: false,
      },
    };
  },
});

const schemaInlineMath = Node.create({
  name: "inlineMath",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex"),
        renderHTML: (attributes) => ({
          "data-latex": attributes.latex,
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-type="inline-math"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "inline-math" }),
    ];
  },
});

const schemaBlockMath = Node.create({
  name: "blockMath",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex"),
        renderHTML: (attributes) => ({
          "data-latex": attributes.latex,
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="block-math"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "block-math" }),
    ];
  },
});

/** An optional positive whole number, kept in `data-<key>`. */
function numberAttribute(key: string) {
  const name = `data-${key}`;
  return {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const value = Number.parseInt(element.getAttribute(name) ?? "", 10);
      return Number.isInteger(value) && value > 0 ? value : null;
    },
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes[key] == null ? {} : { [name]: attributes[key] },
  };
}

/** An optional string, kept in `data-<key>` unless `name` is given. */
function textAttribute(key: string, name = `data-${key}`) {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute(name) || null,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes[key] == null ? {} : { [name]: attributes[key] },
  };
}

/**
 * An embedded video, stored as its provider and video ID (see
 * `video-source.ts`); readers get the provider's player from those. The
 * title, cover and length are looked up when it is embedded. A Direct Video
 * has the provider `direct` and keeps its file's address in `src` and the
 * page it was found on in `pageUrl` instead, its poster in `cover`.
 */
export const schemaVideo = Node.create({
  name: "video",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      provider: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-provider"),
        renderHTML: (attributes) => ({
          "data-provider": attributes.provider,
        }),
      },
      videoId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-video-id"),
        renderHTML: (attributes) => ({
          "data-video-id": attributes.videoId,
        }),
      },
      page: numberAttribute("page"),
      start: numberAttribute("start"),
      title: textAttribute("title"),
      cover: textAttribute("cover"),
      duration: numberAttribute("duration"),
      src: textAttribute("src"),
      pageUrl: textAttribute("pageUrl", "data-page-url"),
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="video"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video" })];
  },
});

export function createSchemaExtensions(overrides?: {
  codeBlock?: AnyExtension;
  image?: AnyExtension;
  mathematics?: ReadonlyArray<AnyExtension>;
  video?: AnyExtension;
}): Array<AnyExtension> {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
      code: {
        HTMLAttributes: {
          spellCheck: false,
        },
      },
      link: {
        autolink: true,
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
        },
      },
    }),
    HeadingExtension.configure({
      levels: [2, 3, 4],
    }),
    BlockQuoteExtension,
    overrides?.codeBlock ?? schemaCodeBlock,
    ...(overrides?.mathematics ?? [schemaInlineMath, schemaBlockMath]),
    ...TableBlockExtension,
    overrides?.image ?? schemaImage,
    overrides?.video ?? schemaVideo,
  ];
}

export const schemaExtensions = createSchemaExtensions();
