import FileHandler from "@tiptap/extension-file-handler";
import Mathematics from "@tiptap/extension-mathematics";
import Placeholder from "@tiptap/extension-placeholder";
import TableOfContents from "@tiptap/extension-table-of-contents";
import type { Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";
import {
  getActiveFormulaModalOpenerKey,
  openFormulaModalForEdit,
} from "@/components/tiptap-editor/formula-modal-store";
import { uploadImageFn } from "@/features/media/api/media.api";
import { CodeBlockExtension } from "@/features/posts/editor/extensions/code-block";
import { ImageExtension } from "@/features/posts/editor/extensions/images";
import { TableBlockExtension } from "@/features/posts/editor/extensions/table";
import { BlockQuoteExtension } from "@/features/posts/editor/extensions/typography/block-quote";
import { HeadingExtension } from "@/features/posts/editor/extensions/typography/heading";
import type { ImageUploadResult } from "@/features/posts/editor/extensions/upload-image";
import { ImageUpload } from "@/features/posts/editor/extensions/upload-image";
import { slugify } from "@/features/posts/utils/content";
import { m } from "@/paraglide/messages";

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

async function handleImageUpload(file: File): Promise<ImageUploadResult> {
  const formData = new FormData();
  formData.append("image", file);

  const result = await uploadImageFn({ data: formData });
  if (result.error) {
    throw new Error(m.media_upload_error_db());
  }
  toast.success(m.media_upload_success({ name: file.name }), {
    description: m.editor_image_upload_success_desc({ name: file.name }),
  });

  return {
    url: result.data.url,
    width: result.data.width || undefined,
    height: result.data.height || undefined,
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
      toast.error(m.editor_image_upload_failed(), {
        description: error.message || m.editor_action_unknown_error(),
      });
    },
  }),
  FileHandler.configure({
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    onDrop: handleFileDrop,
    onPaste: handleFilePaste,
  }),
  Placeholder.configure({
    placeholder: m.editor_content_placeholder(),
    emptyEditorClass: "is-editor-empty",
  }),
  TableOfContents.configure({
    getId: (text) => slugify(text),
  }),
];
