import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TableOfContentsItem } from "@/features/posts/utils/toc";
import { useActiveTOC } from "@/hooks/use-active-toc";
import { cn } from "@/lib/utils";

export default function TableOfContents({
  headers,
}: {
  headers: Array<TableOfContentsItem>;
}) {
  const activeId = useActiveTOC(headers);
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  // For the active indicator backdrop
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
  }>({ top: 0, height: 0, opacity: 0 });

  // Calculate min depth
  const minDepth = useMemo(() => {
    let min = 10;
    for (const heading of headers) {
      if (heading.level < min) min = heading.level;
    }
    return min;
  }, [headers]);

  // Max depth visible in TOC from config (mocked as 3 for now, standard config)
  const maxLevel = 3;

  // Track heading h1 count equivalent
  let heading1Count = 1;

  const removeTailingHash = (text: string) => {
    const lastIndexOfHash = text.lastIndexOf("#");
    if (lastIndexOfHash !== -1 && lastIndexOfHash === text.length - 1) {
      return text.substring(0, lastIndexOfHash);
    }
    return text;
  };

  useEffect(() => {
    if (activeId && navRef.current) {
      const activeLink = navRef.current.querySelector<HTMLElement>(
        `a[href="#${activeId}"]`,
      );

      const tocRoot = navRef.current.querySelector<HTMLElement>(".toc-root");

      if (activeLink && tocRoot) {
        const rootRect = tocRoot.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();
        const scrollOffset = tocRoot.scrollTop;

        setIndicatorStyle({
          top: linkRect.top - rootRect.top + scrollOffset,
          height: linkRect.height,
          opacity: 1,
        });

        // Auto scroll to make it visible
        const tocHeight = tocRoot.clientHeight;
        const linkTop = activeLink.offsetTop;

        if (
          linkRect.bottom - linkRect.top < 0.9 * tocHeight &&
          linkRect.top - rootRect.top < 32
        ) {
          tocRoot.scrollTop = Math.max(0, linkTop - 32);
        } else if (linkRect.bottom - rootRect.top > tocHeight * 0.8) {
          tocRoot.scrollTop = linkTop - tocHeight * 0.8;
        }
      }
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeId]);

  if (headers.length === 0) return null;

  return (
    <nav
      ref={navRef}
      className="sticky top-24 self-start block w-64 fuwari-card-base p-6 max-h-[calc(100vh-6rem)] transition"
    >
      <div className="font-bold text-lg fuwari-text-90 relative ml-3 mb-4">
        <span className="absolute -left-3 top-[5.5px] w-1 h-4 rounded-md bg-(--fuwari-primary)" />
        目录
      </div>

      <div
        className="relative toc-root overflow-y-auto overflow-x-hidden custom-scrollbar max-h-[calc(100vh-12rem)]"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="group relative flex flex-col w-full">
          {headers
            .filter((heading) => heading.level < minDepth + maxLevel)
            .map((heading) => {
              const text = removeTailingHash(heading.text);
              const isH1 = heading.level === minDepth;
              const isH2 = heading.level === minDepth + 1;
              const isH3 = heading.level === minDepth + 2;

              return (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.id);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" });
                      navigate({
                        hash: heading.id,
                        replace: true,
                        hashScrollIntoView: false,
                      });
                    }
                  }}
                  className="px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) py-2 z-10"
                >
                  <div
                    className={cn(
                      "transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold",
                      {
                        "bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content)":
                          isH1,
                        "ml-4": isH2,
                        "ml-8": isH3,
                      },
                    )}
                  >
                    {isH1 && heading1Count++}
                    {isH2 && (
                      <div className="transition w-2 h-2 rounded-[0.1875rem] bg-(--fuwari-btn-regular-bg)"></div>
                    )}
                    {isH3 && (
                      <div className="transition w-1.5 h-1.5 rounded-sm bg-black/5 dark:bg-white/10"></div>
                    )}
                  </div>

                  <div
                    className={cn("transition text-sm", {
                      "fuwari-text-50": isH1 || isH2,
                      "fuwari-text-30": isH3,
                      "fuwari-text-75 font-bold": activeId === heading.id,
                    })}
                  >
                    {text}
                  </div>
                </a>
              );
            })}

          {/* Active Indicator Backdrop */}
          {headers.length > 0 && (
            <div
              className={cn(
                "absolute left-0 right-0 rounded-xl transition-all duration-300 ease-out z-0 border-2 border-dashed pointer-events-none",
                "bg-(--fuwari-btn-plain-bg-hover) border-(--fuwari-btn-plain-bg-hover) group-hover:bg-transparent group-hover:border-(--fuwari-btn-active)",
              )}
              style={{
                top: `${indicatorStyle.top}px`,
                height: `${indicatorStyle.height}px`,
                opacity: indicatorStyle.opacity,
              }}
            />
          )}
        </div>
      </div>
    </nav>
  );
}
