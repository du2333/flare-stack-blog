import type { Editor, NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { Check, Copy } from "lucide-react";
import {
  useContext,
  useEffect,
  useReducer,
  useState,
  type MouseEvent,
} from "react";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { codeBlockHighlightKey } from "@/features/posts/utils/apply-code-block-highlighting";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { CodeBlockHighlightContext } from "./code-block-highlight-context";
import {
  codeBlockTextPos,
  isTextSelectionInsideCodeBlock,
  requestEditorCodeHighlight,
  resolveEditorCodeHighlightHtml,
  scheduleIdle,
  textOffsetFromPoint,
} from "./highlight";
import { getLanguages } from "./languages";

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
  const [copied, setCopied] = useState(false);
  const [, rerender] = useReducer((tick: number) => tick + 1, 0);
  const [computedHtml, setComputedHtml] = useState<string | undefined>();
  const [computedKey, setComputedKey] = useState<string | null>(null);

  const language = node.attrs.language || "text";
  const code = node.textContent;
  const languages = getLanguages();
  const editing = selectionIsInCodeBlock(editor, getPos);
  const resolvedHtml = resolveEditorCodeHighlightHtml(
    language,
    code,
    snapshotHtml,
  );
  const currentKey = codeBlockHighlightKey(language, code);
  const html =
    resolvedHtml ?? (computedKey === currentKey ? computedHtml : undefined);
  const showPreview = Boolean(html) && !editing;

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
    if (editing || html) return;
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
  }, [editing, html, language, code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreviewMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!editor.isEditable || event.button !== 0) return;
    event.preventDefault();
    const pos = getPos();
    if (typeof pos !== "number") return;
    const offset =
      textOffsetFromPoint(event.currentTarget, event.clientX, event.clientY) ??
      0;
    const target = codeBlockTextPos(pos, offset, code.length);
    editor.chain().focus().setTextSelection(target).run();
  };

  return (
    <NodeViewWrapper className="not-prose group relative my-6 max-w-full outline-none [&.ProseMirror-selectednode]:outline-none [&.ProseMirror-selectednode]:ring-0 [&.ProseMirror-selectednode]:shadow-none">
      <div className="expressive-code relative overflow-hidden rounded-xl border border-black/10 bg-(--fuwari-code-bg) shadow-sm transition-colors dark:border-white/10">
        <div
          contentEditable={false}
          className="absolute top-2 right-2 z-10 flex items-center gap-1"
        >
          <button
            type="button"
            onClick={handleCopy}
            aria-label={m.common_copy_code()}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent text-gray-400 opacity-0 transition-all duration-300 group-hover:opacity-100",
              "hover:border-black/10 hover:bg-black/5 hover:text-black dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white",
              copied && "scale-110 text-green-500 hover:text-green-500",
            )}
          >
            {copied ? (
              <Check strokeWidth={2.5} className="h-4 w-4" />
            ) : (
              <Copy strokeWidth={2.5} className="h-4 w-4" />
            )}
          </button>
          {editor.isEditable ? (
            <DropdownMenu
              value={language}
              onChange={(val) => updateAttributes({ language: val })}
              options={languages.map((lang) => ({
                label: lang.label,
                value: lang.value,
              }))}
            />
          ) : null}
        </div>

        <pre
          className={cn(
            "relative m-0 overflow-x-auto custom-scrollbar",
            showPreview && "hidden",
          )}
        >
          <NodeViewContent
            as="div"
            className="block w-fit min-w-full px-5 py-4 font-mono text-sm leading-relaxed whitespace-pre outline-none fuwari-text-90"
            spellCheck={false}
          />
        </pre>

        {showPreview ? (
          <div
            contentEditable={false}
            className={cn(
              "overflow-x-auto custom-scrollbar",
              editor.isEditable && "cursor-text",
            )}
            onMouseDown={handlePreviewMouseDown}
          >
            <div
              className="[&>pre]:px-5 [&>pre]:py-4 [&>pre]:m-0 [&>pre]:min-w-full [&>pre]:w-fit [&_code]:block [&_code]:w-fit [&>pre]:rounded-xl [&>pre>code]:p-0"
              dangerouslySetInnerHTML={{ __html: html ?? "" }}
            />
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}
