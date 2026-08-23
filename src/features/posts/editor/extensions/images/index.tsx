import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { ImageBlock } from "./block";

export const ImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      uploadId: {
        default: null,
        rendered: false,
      },
    };
  },

  addNodeView() {
    if (this.options.inline) {
      return this.parent?.() ?? null;
    }
    return ReactNodeViewRenderer(ImageBlock);
  },
});
