import FileHandler from "@tiptap/extension-file-handler";
import Mathematics from "@tiptap/extension-mathematics";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";
import {
  getActiveFormulaModalOpenerKey,
  openFormulaModalForEdit,
} from "@/components/tiptap-editor/formula-modal-store";
import { CodeBlockExtension } from "@/features/posts/editor/extensions/code-block";
import { ImageExtension } from "@/features/posts/editor/extensions/images";
import { TableBlockExtension } from "@/features/posts/editor/extensions/table";
import { BlockQuoteExtension } from "@/features/posts/editor/extensions/typography/block-quote";
import { HeadingExtension } from "@/features/posts/editor/extensions/typography/heading";
import type { ImageUploadResult } from "@/features/posts/editor/extensions/upload-image";
import { ImageUpload } from "@/features/posts/editor/extensions/upload-image";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

async function handleImageUpload(file: File): Promise<ImageUploadResult> {
  const result = await orpcClient.media.upload({ image: file });
  toast.success(m.media_upload_success());

  return {
    url: result.url,
    width: result.width || undefined,
    height: result.height || undefined,
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

function createSchemaExtensions(mathClick: boolean) {
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
    CodeBlockExtension,
    Mathematics.configure({
      katexOptions: { throwOnError: false },
      ...(mathClick
        ? {
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
          }
        : {}),
    }),
    ...TableBlockExtension,
    ImageExtension,
  ];
}

export const schemaExtensions = createSchemaExtensions(false);

export const inspectExtensions = schemaExtensions;

export const extensions = [
  ...createSchemaExtensions(true),
  Placeholder.configure({
    placeholder: m.editor_content_placeholder(),
    emptyEditorClass: "is-editor-empty",
  }),
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
];
