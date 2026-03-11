import type { NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import DropdownMenu from "@/components/ui/dropdown-menu";
import {
  getHighlighter,
  loadLanguage,
  themes as shikiThemes,
} from "@/lib/shiki";
import { m } from "@/paraglide/messages";
import { getLanguages } from "./languages";

export function CodeBlockView({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const [themeStyles, setThemeStyles] = useState<React.CSSProperties>({});
  const language = node.attrs.language || "text";
  const languages = getLanguages();

  useEffect(() => {
    let mounted = true;

    // Load language and theme styles
    const init = async () => {
      await loadLanguage(language);

      const h = await getHighlighter();
      const lightTheme = h.getTheme(shikiThemes.light);
      const darkTheme = h.getTheme(shikiThemes.dark);

      if (mounted) {
        setThemeStyles({
          "--shiki-light": lightTheme.fg,
          "--shiki-dark": darkTheme.fg,
          "--shiki-light-bg": lightTheme.bg,
          "--shiki-dark-bg": darkTheme.bg,
        } as React.CSSProperties);

        // Trigger re-decoration in shiki plugin
        const tr = editor.state.tr.setMeta("shikiUpdate", true);
        editor.view.dispatch(tr);
      }
    };

    init();

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
      <div className="relative rounded-sm border border-zinc-200/40 dark:border-zinc-800/40 hover:border-zinc-300/60 dark:hover:border-zinc-700/60 transition-colors duration-500">
        {/* Minimal Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200/10 dark:border-zinc-800/10 bg-zinc-100 dark:bg-zinc-800 select-none rounded-t-sm">
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
            className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-all duration-300"
          >
            {copied ? (
              <span className="animate-in fade-in slide-in-from-right-1 opacity-70">
                {m.common_copied()}
              </span>
            ) : null}
            <div className="p-0.5 opacity-60 group-hover/btn:opacity-100 transition-opacity">
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </div>
          </button>
        </div>

        {/* Code Area */}
        <div
          className="shiki relative overflow-x-auto custom-scrollbar rounded-b-sm"
          style={themeStyles}
        >
          <NodeViewContent
            as="div"
            className="p-6 font-mono text-sm leading-relaxed outline-none min-w-full w-fit"
            spellCheck={false}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
