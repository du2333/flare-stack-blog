import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlock from "@tiptap/extension-code-block";
import { CodeBlockView } from "./code-block-view";
import { createShikiPlugin } from "./shiki-plugin";

export const CodeBlockExtension = CodeBlock.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      languageClassPrefix: "language-",
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      defaultLanguage: null,
    } as ReturnType<NonNullable<typeof this.parent>>;
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
  addProseMirrorPlugins() {
    return [...(this.parent?.() || []), createShikiPlugin({ name: this.name })];
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        return this.editor.commands.insertContent("  ");
      },
    };
  },
});
