import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { LANGUAGES } from "./languages";
import type { NodeViewProps } from "@tiptap/react";
import { loadLanguage } from "@/lib/shiki";
import DropdownMenu from "@/components/ui/dropdown-menu";

export function CodeBlockView({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = node.attrs.language || "text";

  useEffect(() => {
    let mounted = true;
    loadLanguage(language).then(() => {
      if (mounted) {
        // Trigger re-decoration in shiki plugin
        const tr = editor.state.tr.setMeta("shikiUpdate", true);
        editor.view.dispatch(tr);
      }
    });

    return () => {
      mounted = false;
    };
  }, [language, editor]);

  const handleCopy = () => {
    const code = node.textContent;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="my-12 group relative max-w-full outline-none [&.ProseMirror-selectednode]:outline-none [&.ProseMirror-selectednode]:ring-0 [&.ProseMirror-selectednode]:shadow-none">
      <div className="relative rounded-sm overflow-hidden border border-zinc-200/40 dark:border-zinc-800/40 hover:border-zinc-300/60 dark:hover:border-zinc-700/60 transition-colors duration-500">
        {/* Minimal Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200/10 dark:border-zinc-800/10 bg-zinc-100 dark:bg-zinc-800 select-none rounded-t-sm">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono font-medium text-muted-foreground/60 uppercase tracking-widest">
              <DropdownMenu
                value={language}
                onChange={(val) => updateAttributes({ language: val })}
                options={LANGUAGES.map((lang) => ({
                  label: lang.label,
                  value: lang.value,
                }))}
              />
            </span>
          </div>

          <button
            onClick={handleCopy}
            contentEditable={false}
            className="flex items-center gap-2 text-[10px] font-mono font-medium text-muted-foreground hover:text-foreground transition-all duration-300"
          >
            {copied ? (
              <span className="animate-in fade-in slide-in-from-right-1 tracking-widest text-[9px] uppercase opacity-70">
                Copied
              </span>
            ) : null}
            <div className="p-0.5 opacity-60 group-hover/btn:opacity-100 transition-opacity">
              {copied ? <Check size={10} /> : <Copy size={10} />}
            </div>
          </button>
        </div>

        {/* Code Area */}
        <NodeViewContent
          as="div"
          className="relative p-6 overflow-x-auto custom-scrollbar text-sm font-mono leading-relaxed outline-none text-muted-foreground [&_.shiki]:text-muted-foreground [&_span]:text-muted-foreground bg-zinc-50 dark:bg-zinc-900 rounded-b-sm"
          spellCheck={false}
        />
      </div>
    </NodeViewWrapper>
  );
}
