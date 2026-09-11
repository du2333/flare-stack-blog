import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Children } from "react";
import { MathFormula } from "@/components/content/math-formula";
import { schemaExtensions } from "@/features/posts/editor/schema";
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
        table: ({ node, children }) => {
          const rows = Children.toArray(children);
          const headerCount = leadingHeaderRowCount(node);
          const headerRows = rows.slice(0, headerCount);
          const bodyRows = rows.slice(headerCount);
          return (
            <div className="fuwari-table-scroll">
              <table>
                {headerRows.length > 0 ? <thead>{headerRows}</thead> : null}
                {bodyRows.length > 0 ? <tbody>{bodyRows}</tbody> : null}
              </table>
            </div>
          );
        },
        tableCell: ({ node, children }) => {
          const attrs = node.attrs as {
            colspan?: number;
            rowspan?: number;
          };
          return (
            <td colSpan={attrs.colspan} rowSpan={attrs.rowspan}>
              {children}
            </td>
          );
        },
        tableHeader: ({ node, children }) => {
          const attrs = node.attrs as {
            colspan?: number;
            rowspan?: number;
          };
          return (
            <th colSpan={attrs.colspan} rowSpan={attrs.rowspan}>
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

function leadingHeaderRowCount(node: ProseMirrorNode): number {
  let count = 0;
  for (let i = 0; i < node.childCount; i += 1) {
    const row = node.child(i);
    if (row.childCount === 0) break;
    let allHeader = true;
    for (let j = 0; j < row.childCount; j += 1) {
      if (row.child(j).type.name !== "tableHeader") {
        allHeader = false;
        break;
      }
    }
    if (!allHeader) break;
    count += 1;
  }
  return count;
}
