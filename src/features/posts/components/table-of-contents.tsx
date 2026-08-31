import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { TableOfContentsItem } from "@/features/posts/utils/toc";
import { cn, isSSR } from "@/lib/utils";

const BANNER_HEIGHT_PAGE_VH = 35;
const MAX_LEVEL = 3;

function removeTailingHash(text: string) {
  const lastIndexOfHash = text.lastIndexOf("#");
  if (lastIndexOfHash !== -1 && lastIndexOfHash === text.length - 1) {
    return text.substring(0, lastIndexOfHash);
  }
  return text;
}

export default function TableOfContents({
  headers,
}: {
  headers: Array<TableOfContentsItem>;
}) {
  const visibleHeaders = useMemo(() => {
    if (headers.length === 0) return [];
    let minDepth = 10;
    for (const heading of headers) {
      if (heading.level < minDepth) minDepth = heading.level;
    }
    return headers
      .filter((heading) => heading.level < minDepth + MAX_LEVEL)
      .map((heading) => ({
        ...heading,
        relative: heading.level - minDepth,
        text: removeTailingHash(heading.text),
      }));
  }, [headers]);

  const slotRef = useRef<HTMLDivElement>(null);
  const tocEl = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const anchorTarget = useRef<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [activeIndices, setActiveIndices] = useState<Array<number>>([]);
  const [indicator, setIndicator] = useState({
    top: 0,
    height: 0,
    opacity: 0,
  });

  const updateSlotLeft = useCallback(() => {
    const slot = slotRef.current;
    if (!slot) return;
    setLeft(slot.getBoundingClientRect().left);
  }, []);

  const computeActive = useCallback(() => {
    if (visibleHeaders.length === 0) return;

    const active = new Array(visibleHeaders.length).fill(false);

    for (let i = 0; i < visibleHeaders.length; i++) {
      const heading = document.getElementById(visibleHeaders[i].id);
      if (!heading) continue;

      const sectionTop = heading.getBoundingClientRect().top;
      let sectionBottom: number;
      if (i < visibleHeaders.length - 1) {
        const next = document.getElementById(visibleHeaders[i + 1].id);
        sectionBottom = next
          ? next.getBoundingClientRect().top
          : window.innerHeight;
      } else {
        const content = heading.closest(".fuwari-custom-md");
        sectionBottom = content
          ? content.getBoundingClientRect().bottom
          : window.innerHeight;
      }

      const inView =
        (sectionTop >= -1 && sectionTop < window.innerHeight) ||
        (sectionBottom > 1 && sectionBottom <= window.innerHeight) ||
        (sectionTop < 0 && sectionBottom > window.innerHeight);

      if (inView) {
        active[i] = true;
      } else if (sectionTop > window.innerHeight) {
        break;
      }
    }

    const next: Array<number> = [];
    let i = active.length - 1;
    let min = active.length - 1;
    let max = -1;
    while (i >= 0 && !active[i]) i--;
    while (i >= 0 && active[i]) {
      min = Math.min(min, i);
      max = Math.max(max, i);
      i--;
    }
    if (min <= max) {
      for (let j = min; j <= max; j++) next.push(j);
    }

    setActiveIndices((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  }, [visibleHeaders]);

  useLayoutEffect(() => {
    updateSlotLeft();
    window.addEventListener("resize", updateSlotLeft);
    return () => window.removeEventListener("resize", updateSlotLeft);
  }, [updateSlotLeft]);

  useEffect(() => {
    const onScroll = () => {
      const banner = window.innerHeight * (BANNER_HEIGHT_PAGE_VH / 100);
      setIsVisible(window.scrollY > banner);
      computeActive();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [computeActive]);

  useEffect(() => {
    setIsReady(false);
    const prose = document.querySelector(".fuwari-custom-md");
    const start = () => {
      setIsReady(true);
      computeActive();
    };
    if (prose) {
      prose.addEventListener("animationend", start, { once: true });
    }
    const t = window.setTimeout(start, 400);
    return () => {
      prose?.removeEventListener("animationend", start);
      window.clearTimeout(t);
    };
  }, [visibleHeaders, computeActive]);

  useEffect(() => {
    const container = linksRef.current;
    const scroller = tocEl.current;
    if (!container || activeIndices.length === 0) {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    const first = container.querySelector<HTMLElement>(
      `a[href="#${visibleHeaders[activeIndices[0]]?.id}"]`,
    );
    const last = container.querySelector<HTMLElement>(
      `a[href="#${visibleHeaders[activeIndices.at(-1) ?? -1]?.id}"]`,
    );
    if (!first || !last) {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    const parentTop = container.getBoundingClientRect().top;
    const top = first.getBoundingClientRect().top - parentTop;
    const height =
      last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
    setIndicator({ top, height, opacity: 1 });

    if (anchorTarget.current || !scroller) return;
    const tocHeight = scroller.clientHeight;
    const scrollTarget =
      height < 0.9 * tocHeight
        ? first.offsetTop - 32
        : last.offsetTop + last.offsetHeight - tocHeight * 0.8;
    scroller.scrollTo({ top: scrollTarget, behavior: "smooth" });
  }, [activeIndices, visibleHeaders]);

  if (visibleHeaders.length === 0) return null;

  let h1Count = 1;
  const toc = (
    <nav
      className={cn(
        "hidden 2xl:block fixed top-14 z-20 pl-4 transition duration-300",
        isVisible && isReady ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      style={{
        left: left ?? 0,
        width: "var(--fuwari-toc-width)",
      }}
    >
      <div
        ref={tocEl}
        className="fuwari-hide-scrollbar h-[calc(100vh-20rem)] overflow-y-scroll overflow-x-hidden"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 2rem, black calc(100% - 2rem), transparent 100%)",
        }}
      >
        <div className="h-8 w-full" />
        <div ref={linksRef} className="group relative flex flex-col w-full">
          {visibleHeaders.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(heading.id);
                if (!element) return;
                anchorTarget.current = heading.id;
                const top =
                  element.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top, behavior: "smooth" });
                history.replaceState(null, "", `#${heading.id}`);
                window.setTimeout(() => {
                  if (anchorTarget.current === heading.id) {
                    anchorTarget.current = null;
                  }
                }, 600);
              }}
              className={cn(
                "px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl py-2 z-10",
                "hover:bg-(--fuwari-toc-btn-hover) active:bg-(--fuwari-toc-btn-active)",
              )}
            >
              <div
                className={cn(
                  "transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold",
                  heading.relative === 0 &&
                    "bg-(--fuwari-toc-badge-bg) text-(--fuwari-btn-content)",
                  heading.relative === 1 && "ml-4",
                  heading.relative === 2 && "ml-8",
                )}
              >
                {heading.relative === 0 && h1Count++}
                {heading.relative === 1 && (
                  <div className="transition w-2 h-2 rounded-[0.1875rem] bg-(--fuwari-toc-badge-bg)" />
                )}
                {heading.relative === 2 && (
                  <div className="transition w-1.5 h-1.5 rounded-sm bg-black/5 dark:bg-white/10" />
                )}
              </div>
              <div
                className={cn(
                  "transition text-sm",
                  heading.relative === 2 ? "fuwari-text-30" : "fuwari-text-50",
                )}
              >
                {heading.text}
              </div>
            </a>
          ))}
          <div
            className="-z-10 absolute left-0 right-0 rounded-xl transition-all bg-(--fuwari-toc-btn-hover) border-2 border-dashed border-(--fuwari-toc-btn-hover) group-hover:bg-transparent group-hover:border-(--fuwari-toc-btn-active) pointer-events-none"
            style={{
              top: indicator.top,
              height: indicator.height,
              opacity: indicator.opacity,
            }}
          />
        </div>
        <div className="h-8 w-full" />
      </div>
    </nav>
  );

  return (
    <>
      <div
        ref={slotRef}
        className="hidden 2xl:block absolute top-0 right-0 w-0 h-0"
        aria-hidden
      />
      {!isSSR && left != null ? createPortal(toc, document.body) : null}
    </>
  );
}
