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

export function createSchemaExtensions(overrides?: {
  codeBlock?: AnyExtension;
  image?: AnyExtension;
  mathematics?: ReadonlyArray<AnyExtension>;
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
  ];
}

export const schemaExtensions = createSchemaExtensions();
