import { useNavigate } from "@tanstack/react-router";
import type { TableOfContentsItem } from "@/features/posts/utils/toc";
import { useActiveTOC } from "@/hooks/use-active-toc";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
  headers: Array<TableOfContentsItem>;
}

/**
 * 文章目录列表(供侧栏 #toc 模块渲染):
 * 按标题层级缩进,滚动高亮当前章节,点击平滑跳转。
 */
export default function TableOfContents({ headers }: TableOfContentsProps) {
  const activeId = useActiveTOC(headers);
  const navigate = useNavigate();

  if (headers.length === 0) return null;

  const minLevel = Math.min(...headers.map((h) => h.level));

  return (
    <nav className="cuckoo-toc-scrollbar max-h-100 w-full overflow-y-auto">
      {headers.map((heading) => {
        const indent = (heading.level - minLevel) * 0.875;
        const isActive = activeId === heading.id;
        return (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById(heading.id);
              if (element) {
                const top =
                  element.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top, behavior: "smooth" });
                navigate({ hash: heading.id, replace: true });
              }
            }}
            className={cn(
              "block py-1.5 pr-2 text-sm leading-snug transition-colors",
              isActive
                ? "is-active-link font-bold text-(--cuckoo-accent)"
                : "cuckoo-text-50 hover:cuckoo-text-90",
            )}
            style={{ paddingLeft: `${0.25 + indent}rem` }}
          >
            {heading.text}
          </a>
        );
      })}
    </nav>
  );
}
