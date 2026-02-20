import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { ImageDisplay } from "../../content/image-display";
import type { JSONContent } from "@tiptap/react";
import { commentExtensions } from "@/features/comments/components/editor/config";

export function renderCommentReact(content: JSONContent | null) {
  if (!content) return null;
  return renderToReactElement({
    extensions: commentExtensions,
    content,
    options: {
      nodeMapping: {
        image: ({ node }) => {
          const attrs = node.attrs as {
            src: string;
            alt?: string | null;
            width?: number | string;
            height?: number | string;
          };

          const alt =
            (attrs.alt && attrs.alt !== "null" ? attrs.alt : null) ||
            "comment image";

          const width =
            typeof attrs.width === "string"
              ? parseInt(attrs.width)
              : attrs.width;
          const height =
            typeof attrs.height === "string"
              ? parseInt(attrs.height)
              : attrs.height;

          return (
            <ImageDisplay
              src={attrs.src}
              alt={alt}
              width={width || undefined}
              height={height || undefined}
            />
          );
        },
      },
    },
  });
}
