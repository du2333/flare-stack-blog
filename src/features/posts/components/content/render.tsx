import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { MathFormula } from "@/components/content/math-formula";
import { schemaExtensions } from "@/features/posts/editor/config";
import { parseImageSize } from "@/features/posts/utils/normalize-content";
import {
  clampHeadingLevel,
  withUniqueHeadingIds,
} from "@/features/posts/utils/toc";
import { CodeBlock } from "@/features/posts/components/content/code-block";
import { ImageDisplay } from "@/features/posts/components/content/image-display";

export function renderReact(content: JSONContent) {
  return renderToReactElement({
    extensions: schemaExtensions,
    content: withUniqueHeadingIds(content),
    options: {
      nodeMapping: {
        heading: ({ node, children }) => {
          const attrs = node.attrs as { level?: number; id?: string };
          const level = clampHeadingLevel(attrs.level);
          const Tag = `h${level}` as const;
          return <Tag id={attrs.id}>{children}</Tag>;
        },
        image: ({ node }) => {
          const attrs = node.attrs as {
            src: string;
            alt?: string | null;
            width?: number | string;
            height?: number | string;
          };

          const alt =
            (attrs.alt && attrs.alt !== "null" ? attrs.alt : null) ||
            "blog image";

          return (
            <ImageDisplay
              src={attrs.src}
              alt={alt}
              width={parseImageSize(attrs.width)}
              height={parseImageSize(attrs.height)}
            />
          );
        },
        codeBlock: ({ node }) => {
          const code = node.textContent || "";
          const attrs = node.attrs as {
            language?: string | null;
            highlightedHtml?: string;
          };

          return (
            <CodeBlock
              code={code}
              language={attrs.language || null}
              highlightedHtml={attrs.highlightedHtml}
            />
          );
        },
        tableCell: ({ node, children }) => {
          const attrs = node.attrs as {
            colspan?: number;
            rowspan?: number;
            colwidth?: Array<number>;
            style?: string;
          };
          return (
            <td
              colSpan={attrs.colspan}
              rowSpan={attrs.rowspan}
              style={attrs.style ? { width: attrs.style } : undefined}
            >
              {children}
            </td>
          );
        },
        tableHeader: ({ node, children }) => {
          const attrs = node.attrs as {
            colspan?: number;
            rowspan?: number;
            colwidth?: Array<number>;
            style?: string;
          };
          return (
            <th
              colSpan={attrs.colspan}
              rowSpan={attrs.rowspan}
              style={attrs.style ? { width: attrs.style } : undefined}
            >
              {children}
            </th>
          );
        },
        inlineMath: ({ node }) => {
          const latex = (node.attrs as { latex?: string }).latex ?? "";
          return <MathFormula latex={latex} mode="inline" />;
        },
        blockMath: ({ node }) => {
          const latex = (node.attrs as { latex?: string }).latex ?? "";
          return <MathFormula latex={latex} mode="block" />;
        },
      },
    },
  });
}
