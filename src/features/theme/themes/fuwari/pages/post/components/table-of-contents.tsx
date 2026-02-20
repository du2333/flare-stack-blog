import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TableOfContentsItem } from "@/features/posts/utils/toc";
import { cn } from "@/lib/utils";

export default function TableOfContents({
  headers,
}: {
  headers: Array<TableOfContentsItem>;
}) {
  const [activeIndices, setActiveIndices] = useState<Array<number>>([]);
  // Reset active indices when headers change (e.g., during navigation)
  useEffect(() => {
    setActiveIndices([]);
  }, [headers]);

  const [isVisible, setIsVisible] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const tocRootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // For the active indicator backdrop
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
  }>({ top: 0, height: 0, opacity: 0 });

  // Calculate min depth
  const minDepth = useMemo(() => {
    if (headers.length === 0) return 10;
    let min = 10;
    for (const heading of headers) {
      if (heading.level < min) min = heading.level;
    }
    return min;
  }, [headers]);

  // Max depth visible in TOC from config
  const maxLevel = 3;

  const removeTailingHash = (text: string) => {
    const lastIndexOfHash = text.lastIndexOf("#");
    if (lastIndexOfHash !== -1 && lastIndexOfHash === text.length - 1) {
      return text.substring(0, lastIndexOfHash);
    }
    return text;
  };

  // Scroll visibility logic: Show TOC after scrolling past banner area
  useEffect(() => {
    const handleScrollVisibility = () => {
      const scrollY = window.scrollY;
      // Show when scrolled > 350px (approx banner height)
      setIsVisible(scrollY > 350);
    };

    window.addEventListener("scroll", handleScrollVisibility, {
      passive: true,
    });
    handleScrollVisibility(); // Initial check
    return () => window.removeEventListener("scroll", handleScrollVisibility);
  }, []);

  // Intersection Observer for range highlighting
  useEffect(() => {
    if (headers.length === 0) return;

    const observerOption = {
      root: null,
      threshold: [0, 1],
      rootMargin: "-10% 0px -60% 0px", // Focus on top-middle portion of screen
    };

    // Tracks which indices are currently in view
    const intersectingStates = new Array(headers.length).fill(false);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.getAttribute("id");
        const idx = headers.findIndex((h) => h.id === id);
        if (idx !== -1) {
          intersectingStates[idx] = entry.isIntersecting;
        }
      });

      // Find range of active headings
      const newActiveIndices: Array<number> = [];
      let first = -1;
      let last = -1;

      for (let i = 0; i < intersectingStates.length; i++) {
        if (intersectingStates[i]) {
          if (first === -1) first = i;
          last = i;
        }
      }

      // Fallback logic
      if (first === -1) {
        // If nothing is currently "intersecting", find the last heading currently above the focus area
        for (let i = headers.length - 1; i >= 0; i--) {
          const el = document.getElementById(headers[i].id);
          if (el && el.getBoundingClientRect().top < 200) {
            newActiveIndices.push(i);
            break;
          }
        }
      } else {
        // Highlight everything from first visible to last visible
        for (let i = first; i <= last; i++) {
          newActiveIndices.push(i);
        }
      }

      setActiveIndices(newActiveIndices);
    }, observerOption);

    headers.forEach((header) => {
      const el = document.getElementById(header.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headers]);

  // Update indicator style based on the range of active indices
  useEffect(() => {
    if (activeIndices.length > 0 && tocRootRef.current) {
      const firstIdx = activeIndices[0];
      const lastIdx = activeIndices[activeIndices.length - 1];

      // Defensive check: ensure indices are within bounds of current headers
      if (!headers[firstIdx] || !headers[lastIdx]) {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }

      const firstId = headers[firstIdx].id;
      const lastId = headers[lastIdx].id;

      const firstLink = tocRootRef.current.querySelector<HTMLElement>(
        `a[href="#${firstId}"]`,
      );
      const lastLink = tocRootRef.current.querySelector<HTMLElement>(
        `a[href="#${lastId}"]`,
      );

      if (firstLink && lastLink) {
        const rootRect = tocRootRef.current.getBoundingClientRect();
        const firstRect = firstLink.getBoundingClientRect();
        const lastRect = lastLink.getBoundingClientRect();
        const scrollOffset = tocRootRef.current.scrollTop;

        setIndicatorStyle({
          top: firstRect.top - rootRect.top + scrollOffset,
          height: lastRect.bottom - firstRect.top,
          opacity: 1,
        });

        // Auto-scroll TOC inside its own small container if active items go out of view
        const tocHeight = tocRootRef.current.clientHeight;
        if (lastRect.bottom - rootRect.top > tocHeight * 0.9) {
          tocRootRef.current.scrollTop +=
            lastRect.bottom - rootRect.top - tocHeight * 0.8;
        } else if (firstRect.top - rootRect.top < 32) {
          tocRootRef.current.scrollTop -= 32 - (firstRect.top - rootRect.top);
        }
      }
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeIndices, headers]);

  if (headers.length === 0) return null;

  let h1Count = 1;

  return (
    <nav
      ref={navRef}
      className={cn(
        "sticky top-20 self-start block w-full transition-all duration-500",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      <div
        ref={tocRootRef}
        className="relative toc-root overflow-y-auto overflow-x-hidden custom-scrollbar max-h-[calc(100vh-20rem)] hide-scrollbar"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="group relative flex flex-col w-full">
          {headers
            .map((heading, originalIdx) => ({ heading, originalIdx }))
            .filter(({ heading }) => heading.level < minDepth + maxLevel)
            .map(({ heading, originalIdx }) => {
              const text = removeTailingHash(heading.text);
              const isH1 = heading.level === minDepth;
              const isH2 = heading.level === minDepth + 1;
              const isH3 = heading.level === minDepth + 2;
              const isActive = activeIndices.includes(originalIdx);

              return (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.id);
                    if (element) {
                      const top =
                        element.getBoundingClientRect().top +
                        window.scrollY -
                        80;
                      window.scrollTo({ top, behavior: "smooth" });
                      navigate({
                        hash: heading.id,
                        replace: true,
                      });
                    }
                  }}
                  className={cn(
                    "px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl py-2 z-10",
                    "hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active)",
                  )}
                >
                  <div
                    className={cn(
                      "transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold",
                      {
                        "bg-[oklch(0.89_0.050_var(--fuwari-hue))] dark:bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content)":
                          isH1,
                        "ml-4": isH2,
                        "ml-8": isH3,
                      },
                    )}
                  >
                    {isH1 && h1Count++}
                    {isH2 && (
                      <div className="transition w-2 h-2 rounded-[0.1875rem] bg-[oklch(0.89_0.050_var(--fuwari-hue))] dark:bg-(--fuwari-btn-regular-bg)"></div>
                    )}
                    {isH3 && (
                      <div className="transition w-1.5 h-1.5 rounded-sm bg-black/5 dark:bg-white/10"></div>
                    )}
                  </div>

                  <div
                    className={cn("transition text-sm select-none", {
                      "fuwari-text-50": (isH1 || isH2) && !isActive,
                      "fuwari-text-30": isH3 && !isActive,
                      "fuwari-text-75": isActive,
                    })}
                  >
                    {text}
                  </div>
                </a>
              );
            })}

          {/* Active Indicator Backdrop (Fuwari style dashed border) */}
          {headers.length > 0 && (
            <div
              className={cn(
                "absolute left-0 right-0 rounded-xl transition-all duration-300 ease-out z-0 border-2 border-dashed pointer-events-none",
                "bg-(--fuwari-btn-plain-bg-hover) border-(--fuwari-btn-plain-bg-hover) group-hover:bg-transparent group-hover:border-(--fuwari-primary)/50",
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
