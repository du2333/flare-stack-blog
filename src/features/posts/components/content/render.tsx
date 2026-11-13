import type { JSONContent } from "@tiptap/react";
import { Fragment, lazy, type ReactNode, Suspense } from "react";
import { cellAlign } from "@/features/posts/editor/extensions/table/cell-align";
import { jsonTableColumnLayout } from "@/features/posts/editor/extensions/table/column-layout";
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
export const MermaidCodeBlock = lazy(() => import("./mermaid-code-block"));

interface MathRenderers {
  inline: (latex: string) => ReactNode;
  block: (latex: string) => ReactNode;
}

interface NodeProps {
  node: JSONContent;
  /** The node's content, rendered, one entry per child. */
  children: Array<ReactNode>;
  math?: MathRenderers;
}

interface MarkProps {
  attrs: Record<string, unknown>;
  children: ReactNode;
}

/**
 * An attribute as the editor schema reads it: a missing attribute has the
 * schema's default, while a stored `null` stays `null`.
 */
function attr<T>(node: JSONContent, name: string, fallback: T): T {
  const value = node.attrs?.[name];
  return value === undefined ? fallback : (value as T);
}

/**
 * How the public page shows each node type the editor schema has
 * (`schemaExtensions`; a test holds the two together). The body is rendered
 * from its JSON, so the page needs nothing of the editor.
 */
export const nodeRenderers: Record<string, (props: NodeProps) => ReactNode> = {
  doc: ({ children }) => <>{children}</>,
  text: ({ node }) => node.text ?? "",
  paragraph: ({ children }) => <p>{children}</p>,
  hardBreak: () => <br />,
  horizontalRule: () => <hr />,
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  bulletList: ({ children }) => <ul>{children}</ul>,
  orderedList: ({ node, children }) => {
    // As Tiptap's ordered list renders: only a start other than 1 is kept.
    const start = attr<unknown>(node, "start", 1);
    const type = attr<unknown>(node, "type", null);
    return (
      <ol
        start={start !== 1 ? (start as number) : undefined}
        type={
          type && type !== "1"
            ? (type as "1" | "a" | "A" | "i" | "I")
            : undefined
        }
      >
        {children}
      </ol>
    );
  },
  listItem: ({ children }) => <li>{children}</li>,
  heading: ({ node, children }) => {
    const level = clampHeadingLevel(attr(node, "level", 1));
    const id = attr<string | null>(node, "id", null);
    const Tag = `h${level}` as const;
    return (
      <Tag id={id ?? undefined}>
        {children}
        {id ? (
          <a
            href={`#${id}`}
            className="anchor no-styling"
            aria-label={m.post_heading_link()}
          >
            #
          </a>
        ) : null}
      </Tag>
    );
  },
  codeBlock: ({ node }) => {
    const code = textOf(node);
    const language = attr<string | null>(node, "language", null) || null;
    const highlightedHtml =
      attr<string | null>(node, "highlightedHtml", null) ?? undefined;

    const codeBlock = (
      <CodeBlock
        code={code}
        language={language}
        highlightedHtml={highlightedHtml}
      />
    );
    if (!isMermaidLanguage(language)) return codeBlock;

    return (
      <Suspense fallback={codeBlock}>
        <MermaidCodeBlock code={code} highlightedHtml={highlightedHtml} />
      </Suspense>
    );
  },
  image: ({ node }) => {
    const alt = attr<string | null>(node, "alt", null);
    return (
      <ImageDisplay
        src={attr<string | null>(node, "src", null) ?? ""}
        alt={(alt && alt !== "null" ? alt : null) || "blog image"}
        width={parseImageSize(attr(node, "width", null))}
        height={parseImageSize(attr(node, "height", null))}
      />
    );
  },
  video: ({ node }) => {
    const attrs = node.attrs ?? {};
    const source = videoSourceOf(attrs);
    if (source) {
      return <VideoEmbed source={source} meta={videoMetaOf(attrs)} />;
    }
    const direct = directVideoOf(attrs);
    return direct ? <DirectVideoEmbed video={direct} /> : null;
  },
  inlineMath: ({ node, math }) => {
    const latex = attr(node, "latex", "") ?? "";
    return math ? (
      math.inline(latex)
    ) : (
      <span className="tiptap-mathematics-render" data-type="inline-math">
        {latex}
      </span>
    );
  },
  blockMath: ({ node, math }) => {
    const latex = attr(node, "latex", "") ?? "";
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
  table: ({ node, children }) => {
    const headerCount = leadingHeaderRowCount(node.content ?? []);
    const headerRows = children.slice(0, headerCount);
    const bodyRows = children.slice(headerCount);
    // Stored pixel widths are proportions here (ADR 0028).
    const layout = jsonTableColumnLayout(node);
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
  tableRow: ({ children }) => <tr>{children}</tr>,
  tableHeader: ({ node, children }) => {
    const align = cellAlign(node.attrs ?? {});
    return (
      <th
        colSpan={attr(node, "colspan", 1)}
        rowSpan={attr(node, "rowspan", 1)}
        style={align ? { textAlign: align } : undefined}
      >
        {children}
      </th>
    );
  },
  tableCell: ({ node, children }) => {
    const align = cellAlign(node.attrs ?? {});
    return (
      <td
        colSpan={attr(node, "colspan", 1)}
        rowSpan={attr(node, "rowspan", 1)}
        style={align ? { textAlign: align } : undefined}
      >
        {children}
      </td>
    );
  },
};

/**
 * How the public page shows each mark type, in the editor schema's mark
 * order: a text's marks wrap it in this order, the first innermost, as
 * ProseMirror sorts them.
 */
export const markRenderers: Record<string, (props: MarkProps) => ReactNode> = {
  link: ({ attrs, children }) => {
    const link = publicLinkAttributes(attrs);
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
  bold: ({ children }) => <strong>{children}</strong>,
  code: ({ children }) => <code spellCheck={false}>{children}</code>,
  italic: ({ children }) => <em>{children}</em>,
  strike: ({ children }) => <s>{children}</s>,
  underline: ({ children }) => <u>{children}</u>,
};

const MARK_ORDER = new Map(
  Object.keys(markRenderers).map((name, index) => [name, index]),
);

function markRank(type: string): number {
  return MARK_ORDER.get(type) ?? MARK_ORDER.size;
}

/** The text a code block holds. */
function textOf(node: JSONContent): string {
  return (node.content ?? [])
    .map((child) =>
      child.type === "text" ? (child.text ?? "") : textOf(child),
    )
    .join("");
}

/** How many rows at the top of a table hold only header cells. */
function leadingHeaderRowCount(rows: ReadonlyArray<JSONContent>): number {
  let count = 0;
  for (const row of rows) {
    const cells = row.content ?? [];
    if (cells.length === 0) break;
    if (!cells.every((cell) => cell.type === "tableHeader")) break;
    count += 1;
  }
  return count;
}

/**
 * A Post body as React elements, for the public page. Heading ids are made
 * unique first, as the table of contents links to them.
 */
export function renderReact(content: JSONContent, math?: MathRenderers) {
  const renderNode = (node: JSONContent): ReactNode => {
    const renderer = node.type ? nodeRenderers[node.type] : undefined;
    // A node type the public page does not know is left out.
    if (!renderer) return null;
    const children = (node.content ?? []).map((child, index) => (
      // A static body's children never move, so their place is their key.
      <Fragment key={index}>{renderNode(child)}</Fragment>
    ));
    const marks = [...(node.marks ?? [])].sort(
      (a, b) => markRank(a.type) - markRank(b.type),
    );
    return marks.reduce<ReactNode>((inner, mark) => {
      const renderMark = markRenderers[mark.type];
      return renderMark
        ? renderMark({ attrs: mark.attrs ?? {}, children: inner })
        : inner;
    }, renderer({ node, children, math }));
  };

  return renderNode(withUniqueHeadingIds(content));
}
