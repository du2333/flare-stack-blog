import type { NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
          <DropdownMenu
            value={language}
            onChange={(val) => updateAttributes({ language: val })}
            options={languages.map((lang) => ({
              label: lang.label,
              value: lang.value,
            }))}
          />
        </div>

        <pre className="relative m-0 overflow-x-auto custom-scrollbar">
          <NodeViewContent
            as="div"
            className="block w-fit min-w-full px-5 py-4 font-mono text-sm leading-relaxed whitespace-pre outline-none fuwari-text-90"
            spellCheck={false}
          />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
