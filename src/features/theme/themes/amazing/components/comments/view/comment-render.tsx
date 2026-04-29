import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { getCommentExtensions } from "@/features/comments/components/editor/config";
import { ImageDisplay } from "@/features/theme/themes/fuwari/components/content/image-display";

/**
 * Fuwari comment renderer — uses commentExtensions with Fuwari's ImageDisplay.
 * Wrap the output in `fuwari-custom-md prose dark:prose-invert` for article-consistent styles.
 */
export function renderCommentReact(content: JSONContent | null) {
  if (!content) return null;
  return renderToReactElement({
    extensions: getCommentExtensions(),
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
