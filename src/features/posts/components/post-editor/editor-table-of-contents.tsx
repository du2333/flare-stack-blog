import type { Editor } from "@tiptap/react";
import { AlignLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { TableOfContentsItem } from "@/features/posts/utils/toc";
import { useActiveTOC } from "@/hooks/use-active-toc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function EditorTableOfContents({ editor }: { editor: Editor }) {
  const [items, setItems] = useState<Array<TableOfContentsItem>>([]);

  useEffect(() => {
    const updateTOC = () => {
      const content = editor.storage.tableOfContents.content;
      // Map Tiptap TOC items to our standardized TableOfContentsItem
      const newItems = content.map((item) => ({
        id: item.id,
        text: item.textContent,
        level: item.level,
      }));
      setItems(newItems);
    };

    updateTOC();
    editor.on("update", updateTOC);
    return () => {
      editor.off("update", updateTOC);
    };
  }, [editor]);

  const activeId = useActiveTOC(items, {
    containerId: "post-editor-scroll-container",
    topOffset: 0.1,
    bottomOffsetFactor: 0.4,
  });

  if (items.length === 0) return null;

  const handleItemClick = (id: string) => {
    const element = editor.view.dom.querySelector(`[id="${id}"]`);

    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="sticky top-32 self-start hidden xl:block w-60 animate-in fade-in duration-700 delay-500 fill-mode-both max-h-[calc(100vh-10rem)] overflow-y-auto overflow-x-hidden custom-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
        <AlignLeft size={12} />
        <span>{m.editor_toc_title()}</span>
      </div>

      {/* Root List Container */}
      <div className="relative toc-root">
        <ul className="space-y-4 list-none m-0 p-0">
          {items.map((node) => (
            <li key={node.id}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleItemClick(node.id);
                }}
                className={cn(
                  "block text-left w-full text-xs transition-all duration-300 leading-relaxed relative border-l pl-4 font-mono",
                  activeId === node.id
                    ? "border-foreground text-foreground font-bold"
                    : "border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60",
                )}
                style={{ marginLeft: `${(node.level - 1) * 0.5}rem` }}
              >
                {node.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
