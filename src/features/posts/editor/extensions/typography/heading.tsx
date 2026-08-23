import Heading from "@tiptap/extension-heading";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { mergeAttributes } from "@tiptap/react";
import { clampHeadingLevel, uniqueHeadingId } from "@/features/posts/utils/toc";

export const HeadingExtension = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      { tag: "h1", attrs: { level: 2 } },
      { tag: "h2", attrs: { level: 2 } },
      { tag: "h3", attrs: { level: 3 } },
      { tag: "h4", attrs: { level: 4 } },
      { tag: "h5", attrs: { level: 4 } },
      { tag: "h6", attrs: { level: 4 } },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const level = clampHeadingLevel(node.attrs.level);
    const { id, ...rest } = HTMLAttributes;
    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, rest, {
        id: id || uniqueHeadingId(node.textContent, new Set()),
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey("headingNormalize"),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }
          if (
            transactions.some((transaction) =>
              transaction.getMeta("headingNormalize"),
            )
          ) {
            return null;
          }

          const used = new Set<string>();
          const { tr } = newState;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== "heading") return;
            const level = clampHeadingLevel(node.attrs.level);
            const id = node.textContent
              ? uniqueHeadingId(node.textContent, used)
              : null;
            if (node.attrs.level !== level || node.attrs.id !== id) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                level,
                id,
              });
              modified = true;
            }
          });

          if (!modified) return null;
          tr.setMeta("headingNormalize", true);
          return tr;
        },
      }),
    ];
  },
});
