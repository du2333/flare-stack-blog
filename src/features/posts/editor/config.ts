import { toast } from "sonner";
import FileHandler from "@tiptap/extension-file-handler";
import Mathematics from "@tiptap/extension-mathematics";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import TableOfContents from "@tiptap/extension-table-of-contents";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { ImageUploadResult } from "@/features/posts/editor/extensions/upload-image";
import { TableBlockExtension } from "@/features/posts/editor/extensions/table";
import { CodeBlockExtension } from "@/features/posts/editor/extensions/code-block";
import { ImageExtension } from "@/features/posts/editor/extensions/images";
import { BlockQuoteExtension } from "@/features/posts/editor/extensions/typography/block-quote";
import { HeadingExtension } from "@/features/posts/editor/extensions/typography/heading";
import {
  BulletListExtension,
  ListItemExtension,
  OrderedListExtension,
} from "@/features/posts/editor/extensions/typography/list";
import { ImageUpload } from "@/features/posts/editor/extensions/upload-image";
import { uploadImageFn } from "@/features/media/media.api";
import { slugify } from "@/features/posts/utils/content";
import {
  getActiveFormulaModalOpenerKey,
  openFormulaModalForEdit,
} from "@/components/tiptap-editor/formula-modal-store";

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

async function handleImageUpload(file: File): Promise<ImageUploadResult> {
  // Capture image dimensions
  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    },
  );

  const formData = new FormData();
  formData.append("image", file);
  if (dimensions.width) formData.append("width", dimensions.width.toString());
  if (dimensions.height)
    formData.append("height", dimensions.height.toString());

  const result = await uploadImageFn({ data: formData });
  toast.success("图片上传成功", {
    description: `${file.name} 已归档保存`,
  });

  return {
    url: result.url,
    width: result.width || dimensions.width || undefined,
    height: result.height || dimensions.height || undefined,
  };
}

function handleFileDrop(editor: TiptapEditor, files: Array<File>, pos: number) {
  files.forEach((file) => {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      editor.commands.uploadImage(file, pos);
    }
  });
}

function handleFilePaste(editor: TiptapEditor, files: Array<File>) {
  files.forEach((file) => {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      editor.commands.uploadImage(file);
    }
  });
}

export const extensions = [
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
          "font-mono text-sm px-1 text-foreground/80 bg-muted/40 rounded-sm",
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
  BulletListExtension,
  OrderedListExtension,
  ListItemExtension,
  HeadingExtension.configure({
    levels: [1, 2, 3, 4],
  }),
  BlockQuoteExtension,
  CodeBlockExtension,
  Mathematics.configure({
    katexOptions: { throwOnError: false },
    inlineOptions: {
      onClick: (node, pos) => {
        openFormulaModalForEdit({
          latex: node.attrs.latex ?? "",
          pos,
          type: "inline",
          instanceKey: getActiveFormulaModalOpenerKey() ?? undefined,
        });
      },
    },
    blockOptions: {
      onClick: (node, pos) => {
        openFormulaModalForEdit({
          latex: node.attrs.latex ?? "",
          pos,
          type: "block",
          instanceKey: getActiveFormulaModalOpenerKey() ?? undefined,
        });
      },
    },
  }),
  ...TableBlockExtension,
  ImageExtension,
  ImageUpload.configure({
    onUpload: handleImageUpload,
    onError: (error) => {
      toast.error("图片上传失败", {
        description: error.message,
      });
    },
  }),
  FileHandler.configure({
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    onDrop: handleFileDrop,
    onPaste: handleFilePaste,
  }),
  Placeholder.configure({
    placeholder: "开始记录...",
    emptyEditorClass: "is-editor-empty",
  }),
  TableOfContents.configure({
    getId: (text) => slugify(text),
  }),
];
