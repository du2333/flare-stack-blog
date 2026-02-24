import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { GuitarProBlock } from "./block";

/**
 * TipTap 自定义节点扩展 — Guitar Pro 吉他谱嵌入
 *
 * 在编辑器中以块级元素展示，存储 src 和 fileName 属性。
 *
 * Markdown 表示: `<guitar-pro src="/images/xxx.gp5" title="文件名"></guitar-pro>`
 * JSON 表示: `{ type: "guitarPro", attrs: { src, fileName } }`
 */
export const GuitarProExtension = Node.create({
  name: "guitarPro",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
      },
      fileName: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("title") ||
          element.getAttribute("data-filename") ||
          "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "guitar-pro",
      },
      {
        tag: 'div[data-type="guitar-pro"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "guitar-pro",
        class: "guitar-pro-embed",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GuitarProBlock);
  },
});
