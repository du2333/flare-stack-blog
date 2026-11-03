import FileHandler from "@tiptap/extension-file-handler";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { toast } from "sonner";
import { CodeBlockExtension } from "@/features/posts/editor/extensions/code-block";
import { ImageExtension } from "@/features/posts/editor/extensions/images";
import { ImagePlaceholder } from "@/features/posts/editor/extensions/image-placeholder";
import { MarkdownPaste } from "@/features/posts/editor/extensions/markdown-paste";
import { MathEditing } from "@/features/posts/editor/extensions/math-editing";
import { createSchemaExtensions } from "@/features/posts/editor/schema";
import { LinkEditing } from "@/features/posts/editor/extensions/link-editing";
import { SlashMenu } from "@/features/posts/editor/extensions/slash-menu";
import { VideoEditing } from "@/features/posts/editor/extensions/video";
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

/** The post schema, which the read-only revision view renders with alone. */
export const editorSchema = createSchemaExtensions({
  codeBlock: CodeBlockExtension,
  image: ImageExtension,
  mathematics: [MathEditing],
  video: VideoEditing.configure({
    fetchMeta: (source) =>
      orpcClient.posts.admin
        .videoMeta({
          provider: source.provider,
          videoId: source.videoId,
          page: source.page,
        })
        .catch(() => null),
    // The panel treats a rejected lookup as unreachable.
    resolveDirectVideo: (url) => orpcClient.posts.admin.directVideo({ url }),
  }),
});

export const extensions = [
  ...editorSchema,
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
  ImagePlaceholder,
  FileHandler.configure({
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    onDrop: handleFileDrop,
    onPaste: handleFilePaste,
  }),
  SlashMenu,
  LinkEditing,
  MarkdownPaste.configure({
    onLocalImages: (count) => {
      toast.warning(m.editor_markdown_paste_local_images({ count }));
    },
  }),
];
