import type { NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { m } from "@/paraglide/messages";
import { getLanguages } from "./languages";

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = node.attrs.language || "text";
  const languages = getLanguages();

  const handleCopy = () => {
    const code = node.textContent;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="my-12 group relative max-w-full outline-none [&.ProseMirror-selectednode]:outline-none [&.ProseMirror-selectednode]:ring-0 [&.ProseMirror-selectednode]:shadow-none">
      <div className="relative rounded-sm border border-zinc-200/40 transition-colors duration-500 hover:border-zinc-300/60 dark:border-zinc-800/40 dark:hover:border-zinc-700/60">
        <div className="flex select-none items-center justify-between rounded-t-sm border-b border-zinc-200/10 bg-zinc-100 px-4 py-2 dark:border-zinc-800/10 dark:bg-zinc-800">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono font-medium text-muted-foreground/80">
              <DropdownMenu
                value={language}
                onChange={(val) => updateAttributes({ language: val })}
                options={languages.map((lang) => ({
                  label: lang.label,
                  value: lang.value,
                }))}
              />
            </span>
          </div>

          <button
            onClick={handleCopy}
            contentEditable={false}
            className="flex items-center gap-2 font-mono text-xs text-muted-foreground transition-all duration-300 hover:text-foreground"
          >
            {copied ? (
              <span className="animate-in fade-in slide-in-from-right-1 opacity-70">
                {m.common_copied()}
              </span>
            ) : null}
            <div className="p-0.5 opacity-60">
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </div>
          </button>
        </div>

        <pre className="relative m-0 overflow-x-auto rounded-b-sm custom-scrollbar">
          <NodeViewContent
            as="div"
            className="block w-fit min-w-full p-6 font-mono text-sm leading-relaxed whitespace-pre outline-none"
            spellCheck={false}
          />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
