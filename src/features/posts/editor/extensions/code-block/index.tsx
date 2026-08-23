import CodeBlock from "@tiptap/extension-code-block";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CodeBlockView } from "./code-block-view";

export const CodeBlockExtension = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      highlightedHtml: {
        default: null,
        rendered: false,
      },
    };
  },
  addOptions() {
    return {
      ...this.parent?.(),
      languageClassPrefix: "language-",
      enableTabIndentation: true,
      tabSize: 2,
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      defaultLanguage: null,
    } as ReturnType<NonNullable<typeof this.parent>>;
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});
