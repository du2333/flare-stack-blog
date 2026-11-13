import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Children, lazy, type ReactNode, Suspense } from "react";
import { schemaExtensions } from "@/features/posts/editor/schema";
import { cellAlign } from "@/features/posts/editor/extensions/table/column-align";
import { tableColumnLayout } from "@/features/posts/editor/extensions/table/column-widths";
import { isMermaidLanguage } from "@/lib/code-languages";
import { parseImageSize } from "@/features/posts/utils/normalize-content";
import { publicLinkAttributes } from "@/features/posts/utils/public-link";
import {
  clampHeadingLevel,
  withUniqueHeadingIds,
} from "@/features/posts/utils/toc";
import { CodeBlock } from "@/features/posts/components/content/code-block";
import { ImageDisplay } from "@/features/posts/components/content/image-display";
import {
  DirectVideoEmbed,
  VideoEmbed,
} from "@/features/posts/components/content/video-embed";
import {
  directVideoOf,
  videoMetaOf,
  videoSourceOf,
} from "@/features/posts/utils/video-source";
import { m } from "@/paraglide/messages";

// Only posts with a Mermaid code block load the diagram renderer (ADR 0027).
const MermaidCodeBlock = lazy(() => import("./mermaid-code-block"));

export function renderReact(
  content: JSONContent,
  math?: {
    inline: (latex: string) => ReactNode;
    block: (latex: string) => ReactNode;
  },
) {
  return renderToReactElement({
    extensions: schemaExtensions,
    content: withUniqueHeadingIds(content),
    options: {
      nodeMapping: {
        heading: ({ node, children }) => {
          const attrs = node.attrs as { level?: number; id?: string };
          const level = clampHeadingLevel(attrs.level);
          const Tag = `h${level}` as const;
          return (
            <Tag id={attrs.id}>
              {children}
              {attrs.id ? (
                <a
                  href={`#${attrs.id}`}
                  className="anchor no-styling"
                  aria-label={m.post_heading_link()}
                >
                  #
                </a>
              ) : null}
            </Tag>
          );
        },
        video: ({ node }) => {
          const source = videoSourceOf(node.attrs);
          if (source) {
            return (
              <VideoEmbed source={source} meta={videoMetaOf(node.attrs)} />
            );
          }
          const direct = directVideoOf(node.attrs);
          return direct ? <DirectVideoEmbed video={direct} /> : null;
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

          const codeBlock = (
            <CodeBlock
              code={code}
              language={attrs.language || null}
              highlightedHtml={attrs.highlightedHtml}
            />
          );
          if (!isMermaidLanguage(attrs.language)) return codeBlock;

          return (
            <Suspense fallback={codeBlock}>
              <MermaidCodeBlock
                code={code}
                highlightedHtml={attrs.highlightedHtml}
              />
            </Suspense>
          );
        },
        table: ({ node, children }) => {
          const rows = Children.toArray(children);
          const headerCount = leadingHeaderRowCount(node);
          const headerRows = rows.slice(0, headerCount);
          const bodyRows = rows.slice(headerCount);
          // Stored pixel widths are proportions here (ADR 0028).
          const layout = tableColumnLayout(node);
          return (
            <div className="fuwari-table-scroll">
              <table
                style={
                  layout
                    ? { tableLayout: "fixed", minWidth: layout.minWidth }
                    : undefined
                }
              >
                {layout ? (
                  <colgroup>
                    {layout.widths.map((width, index) => (
                      <col key={index} style={{ width }} />
                    ))}
                  </colgroup>
                ) : null}
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
          const align = cellAlign(node.attrs);
          return (
            <td
              colSpan={attrs.colspan}
              rowSpan={attrs.rowspan}
              style={align ? { textAlign: align } : undefined}
            >
              {children}
            </td>
          );
        },
        tableHeader: ({ node, children }) => {
          const attrs = node.attrs as {
            colspan?: number;
            rowspan?: number;
          };
          const align = cellAlign(node.attrs);
          return (
            <th
              colSpan={attrs.colspan}
              rowSpan={attrs.rowspan}
              style={align ? { textAlign: align } : undefined}
            >
              {children}
            </th>
          );
        },
        inlineMath: ({ node }) => {
          const latex = (node.attrs as { latex?: string }).latex ?? "";
          return math ? (
            math.inline(latex)
          ) : (
            <span className="tiptap-mathematics-render" data-type="inline-math">
              {latex}
            </span>
          );
        },
        blockMath: ({ node }) => {
          const latex = (node.attrs as { latex?: string }).latex ?? "";
          return math ? (
            math.block(latex)
          ) : (
            <div
              className="tiptap-mathematics-render katex-display"
              data-type="block-math"
            >
              {latex}
            </div>
          );
        },
      },
      markMapping: {
        link: ({ mark, children }) => {
          const link = publicLinkAttributes(mark.attrs);
          return (
            <a
              href={link.href}
              title={link.title}
              target={link.target}
              rel={link.rel}
            >
              {children}
            </a>
          );
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
