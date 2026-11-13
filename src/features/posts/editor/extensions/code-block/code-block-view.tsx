import type { Editor, NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import {
  useContext,
  useEffect,
  useReducer,
  useState,
  type MouseEvent,
} from "react";
import { ShikiHtml } from "@/components/content/shiki-html";
import { ColourSchemeMermaidDiagram } from "@/components/content/colour-scheme-mermaid-diagram";
import { CodeCopyButton } from "@/components/ui/copy-button";
import { codeBlockHighlightKey } from "@/features/posts/utils/apply-code-block-highlighting";
import { isMermaidLanguage, PLAIN_TEXT } from "@/lib/code-languages";
import { cn } from "@/lib/utils";
import { CodeBlockHighlightContext } from "./code-block-highlight-context";
import {
  codeBlockTextPos,
  isTextSelectionInsideCodeBlock,
  requestEditorCodeHighlight,
  resolveEditorCodeHighlightHtml,
  scheduleIdle,
  textOffsetFromPoint,
} from "./highlight";
import { LanguagePicker } from "./language-picker";

function selectionIsInCodeBlock(
  editor: Editor,
  getPos: () => number | undefined,
) {
  if (!editor.isEditable || !editor.isFocused) return false;
  const { selection, doc } = editor.state;
  if (!(selection instanceof TextSelection)) return false;
  let pos: number | undefined;
  try {
    pos = getPos();
  } catch {
    return false;
  }
  if (typeof pos !== "number") return false;
  const current = doc.nodeAt(pos);
  if (!current || current.type.name !== "codeBlock") return false;
  return isTextSelectionInsideCodeBlock(
    selection.from,
    selection.to,
    pos,
    current.nodeSize,
  );
}

export function CodeBlockView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const snapshotHtml = useContext(CodeBlockHighlightContext);
  const [, rerender] = useReducer((tick: number) => tick + 1, 0);
  const [computedHtml, setComputedHtml] = useState<string | undefined>();
  const [computedKey, setComputedKey] = useState<string | null>(null);

  const language = node.attrs.language || PLAIN_TEXT;
  const code = node.textContent;
  const editing = selectionIsInCodeBlock(editor, getPos);
  const resolvedHtml = resolveEditorCodeHighlightHtml(
    language,
    code,
    snapshotHtml,
  );
  const currentKey = codeBlockHighlightKey(language, code);
  const html =
    resolvedHtml ?? (computedKey === currentKey ? computedHtml : undefined);
  const isMermaid = isMermaidLanguage(language);
  const showDiagram = isMermaid && !editing && code.trim() !== "";
  const showPreview = !isMermaid && Boolean(html) && !editing;

  useEffect(() => {
    const sync = () => rerender();
    editor.on("selectionUpdate", sync);
    editor.on("focus", sync);
    editor.on("blur", sync);
    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("focus", sync);
      editor.off("blur", sync);
    };
  }, [editor]);

  useEffect(() => {
    if (editing || html || isMermaid) return;
    const requestedLanguage = language;
    const requestedCode = code;
    let cancelled = false;
    const cancelIdle = scheduleIdle(() => {
      void requestEditorCodeHighlight(requestedLanguage, requestedCode).then(
        (next) => {
          if (cancelled || !next) return;
          setComputedKey(
            codeBlockHighlightKey(requestedLanguage, requestedCode),
          );
          setComputedHtml(next);
        },
      );
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [editing, html, isMermaid, language, code]);

  const enterSourceEditing = (
    event: MouseEvent<HTMLDivElement>,
    offset: number,
  ) => {
    if (!editor.isEditable || event.button !== 0) return;
    event.preventDefault();
    const pos = getPos();
    if (typeof pos !== "number") return;
    const target = codeBlockTextPos(pos, offset, code.length);
    editor.chain().focus().setTextSelection(target).run();
  };

  const handlePreviewMouseDown = (event: MouseEvent<HTMLDivElement>) =>
    enterSourceEditing(
      event,
      textOffsetFromPoint(event.currentTarget, event.clientX, event.clientY) ??
        0,
    );

  // A point in the diagram maps to no source offset; edit from the end.
  const handleDiagramMouseDown = (event: MouseEvent<HTMLDivElement>) =>
    enterSourceEditing(event, code.length);

  return (
    <NodeViewWrapper className="not-prose group relative my-6 max-w-full outline-none [&.ProseMirror-selectednode]:outline-none [&.ProseMirror-selectednode]:ring-0 [&.ProseMirror-selectednode]:shadow-none">
      <div className="expressive-code relative overflow-hidden rounded-xl border border-black/10 bg-(--fuwari-code-bg) shadow-sm transition-colors dark:border-white/10">
        <div
          contentEditable={false}
          className="absolute top-2 right-2 z-10 flex items-center gap-1"
        >
          <CodeCopyButton code={code} />
          {editor.isEditable ? (
            <LanguagePicker
              value={language}
              onChange={(id) => updateAttributes({ language: id })}
            />
          ) : null}
        </div>

        <pre
          className={cn(
            "relative m-0 overflow-x-auto custom-scrollbar",
            (showPreview || showDiagram) && "hidden",
          )}
        >
          <NodeViewContent
            as="div"
            className="block w-fit min-w-full px-5 py-4 font-mono text-sm leading-relaxed whitespace-pre outline-none fuwari-text-90"
            spellCheck={false}
          />
        </pre>

        {showDiagram ? (
          <div
            contentEditable={false}
            className={cn(editor.isEditable && "cursor-text")}
            onMouseDown={handleDiagramMouseDown}
          >
            <MermaidPreview code={code} highlightedHtml={resolvedHtml} />
          </div>
        ) : null}

        {showPreview ? (
          <div
            contentEditable={false}
            // The size of the code while it is edited (above), and of a
            // code block on the public page: not the body's.
            className={cn(
              "overflow-x-auto font-mono text-sm leading-relaxed custom-scrollbar",
              editor.isEditable && "cursor-text",
            )}
            onMouseDown={handlePreviewMouseDown}
          >
            <ShikiHtml html={html ?? ""} />
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

/**
 * A Mermaid block at rest: the diagram, with the source (highlighted when the
 * snapshot has it) until it renders and on a syntax error.
 */
function MermaidPreview({
  code,
  highlightedHtml,
}: {
  code: string;
  highlightedHtml?: string;
}) {
  return (
    <ColourSchemeMermaidDiagram
      source={code}
      fallback={
        highlightedHtml ? (
          <div className="overflow-x-auto font-mono text-sm leading-relaxed custom-scrollbar">
            <ShikiHtml html={highlightedHtml} />
          </div>
        ) : (
          <pre className="m-0 overflow-x-auto custom-scrollbar px-5 py-4 font-mono text-sm leading-relaxed whitespace-pre fuwari-text-90">
            <code>{code}</code>
          </pre>
        )
      }
    />
  );
}
