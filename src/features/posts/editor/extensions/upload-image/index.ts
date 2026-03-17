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
      /**
       * Upload an image file and insert it into the editor
       * @param file The file to upload
       * @param pos Optional position to insert at
       */
      uploadImage: (file: File, pos?: number) => ReturnType;
    };
  }
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
          const schema = state.schema;

          // 1. Create a local preview URL
          const blobUrl = URL.createObjectURL(file);

          // 2. Insert the image immediately (Optimistic UI)
          if (dispatch) {
            const node = schema.nodes.image.create({
              src: blobUrl,
              alt: file.name,
            });
            const insertPos = pos ?? tr.selection.from;
            tr.insert(insertPos, node);
          }

          // Helper function to find and remove the placeholder node
          const removePlaceholder = (editorView: EditorView, url: string) => {
            if (editorView.isDestroyed) return;

            requestAnimationFrame(() => {
              if (editorView.isDestroyed) return;

              const currentTr = editorView.state.tr;
              let found = false;

              editorView.state.doc.descendants(
                (descendant: ProseMirrorNode, nodePos: number) => {
                  if (found) return false;

                  if (
                    descendant.type.name === "image" &&
                    descendant.attrs.src === url
                  ) {
                    currentTr.delete(nodePos, nodePos + descendant.nodeSize);
                    found = true;
                    return false;
                  }
                  return true;
                },
              );

              editorView.dispatch(currentTr);

              // Revoke the blob URL to free memory
              URL.revokeObjectURL(url);
            });
          };

          // 3. Trigger the actual upload asynchronously
          this.options
            .onUpload(file)
            .then((result) => {
              if (view.isDestroyed) {
                URL.revokeObjectURL(blobUrl);
                return;
              }

              // 4. Find the node again by its blob URL and replace it.
              requestAnimationFrame(() => {
                if (view.isDestroyed) {
                  URL.revokeObjectURL(blobUrl);
                  return;
                }

                const currentTr = view.state.tr;
                let replaced = false;

                view.state.doc.descendants(
                  (descendant: ProseMirrorNode, nodePos: number) => {
                    if (replaced) return false;

                    if (
                      descendant.type.name === "image" &&
                      descendant.attrs.src === blobUrl
                    ) {
                      const newAttrs = {
                        ...descendant.attrs,
                        src: result.url,
                        width: result.width || descendant.attrs.width,
                        height: result.height || descendant.attrs.height,
                      };
                      currentTr.setNodeMarkup(nodePos, undefined, newAttrs);
                      replaced = true;
                      return false;
                    }
                    return true;
                  },
                );

                view.dispatch(currentTr);

                // Revoke the blob URL to free memory
                URL.revokeObjectURL(blobUrl);
              });
            })
            .catch((error) => {
              console.error("Upload failed", error);
              this.options.onError?.(error);
              // Remove the placeholder image on failure
              removePlaceholder(view, blobUrl);
            });

          return true;
        },
    };
  },
});
