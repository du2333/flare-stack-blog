import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

export interface ImageUploadResult {
  url: string;
  width?: number;
  height?: number;
}

export interface ImageUploadOptions {
  onUpload: (file: File) => Promise<ImageUploadResult>;
  onError?: (error: Error) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageUpload: {
      uploadImage: (file: File, pos?: number) => ReturnType;
    };
  }
}

function findImagePosByUploadId(view: EditorView, uploadId: string) {
  let found: number | null = null;
  view.state.doc.descendants((descendant: ProseMirrorNode, nodePos: number) => {
    if (found != null) return false;
    if (
      descendant.type.name === "image" &&
      descendant.attrs.uploadId === uploadId
    ) {
      found = nodePos;
      return false;
    }
    return true;
  });
  return found;
}

export const ImageUpload = Extension.create<ImageUploadOptions>({
  name: "imageUpload",

  addOptions() {
    return {
      onUpload: async () => ({ url: "" }),
      onError: undefined,
    };
  },

  addCommands() {
    return {
      uploadImage:
        (file: File, pos?: number) =>
        ({ tr, dispatch, state, view }) => {
          if (!dispatch) return true;

          const uploadId = crypto.randomUUID();
          const blobUrl = URL.createObjectURL(file);
          const node = state.schema.nodes.image.create({
            src: blobUrl,
            alt: file.name,
            uploadId,
          });
          const insertPos = pos ?? tr.selection.from;
          tr.insert(insertPos, node);

          const removePlaceholder = () => {
            if (view.isDestroyed) {
              URL.revokeObjectURL(blobUrl);
              return;
            }
            const nodePos = findImagePosByUploadId(view, uploadId);
            if (nodePos == null) {
              URL.revokeObjectURL(blobUrl);
              return;
            }
            const current = view.state.doc.nodeAt(nodePos);
            view.dispatch(
              view.state.tr.delete(nodePos, nodePos + (current?.nodeSize ?? 1)),
            );
            URL.revokeObjectURL(blobUrl);
          };

          this.options
            .onUpload(file)
            .then((result) => {
              if (view.isDestroyed) {
                URL.revokeObjectURL(blobUrl);
                return;
              }
              const nodePos = findImagePosByUploadId(view, uploadId);
              if (nodePos == null) {
                URL.revokeObjectURL(blobUrl);
                return;
              }
              const current = view.state.doc.nodeAt(nodePos);
              if (!current) {
                URL.revokeObjectURL(blobUrl);
                return;
              }
              view.dispatch(
                view.state.tr.setNodeMarkup(nodePos, undefined, {
                  ...current.attrs,
                  src: result.url,
                  width: result.width || current.attrs.width,
                  height: result.height || current.attrs.height,
                  uploadId: null,
                }),
              );
              URL.revokeObjectURL(blobUrl);
            })
            .catch((error) => {
              console.error("Upload failed", error);
              this.options.onError?.(error);
              removePlaceholder();
            });

          return true;
        },
    };
  },
});
