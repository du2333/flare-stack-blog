import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { ImageExtension } from "@/features/posts/editor/extensions/images";
import { m } from "@/paraglide/messages";

export const getCommentExtensions = () => [
  StarterKit.configure({
    orderedList: false,
    bulletList: false,
    listItem: false,
    heading: false,
    codeBlock: false,
    blockquote: false,
    code: {
      HTMLAttributes: {
        class:
          "font-mono text-xs px-1 text-foreground/80 bg-muted/40 rounded-sm",
        spellCheck: false,
      },
    },
    underline: {
      HTMLAttributes: {
        class: "underline underline-offset-4 decoration-border/60",
      },
    },
    strike: {
      HTMLAttributes: {
        class: "line-through opacity-50 decoration-foreground/40",
      },
    },
    link: {
      autolink: true,
      openOnClick: false,
      HTMLAttributes: {
        class:
          "font-normal underline underline-offset-4 decoration-border hover:decoration-foreground transition-all duration-300 cursor-pointer text-foreground",
        target: "_blank",
      },
    },
  }),
  ImageExtension.configure({
    inline: true,
    HTMLAttributes: {
      class: "rounded-md max-h-[300px] object-contain my-2", // 限制评论图片大小
    },
  }),
  Placeholder.configure({
    placeholder: m.comments_editor_placeholder(),
    emptyEditorClass: "is-editor-empty",
  }),
];
