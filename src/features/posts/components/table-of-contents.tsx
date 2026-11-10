import { TableOfContents as TocIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  FLOATING_ACTION_BUTTON_CLASS,
  useFloatingActionsSlot,
} from "@/components/layout/floating-actions";
import { FloatingPopover } from "@/components/ui/floating-popover";
import { useJumpToHeading } from "@/features/posts/components/content/use-jump-to-heading";
import type { TableOfContentsItem } from "@/features/posts/utils/toc";
import { cn, isSSR } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
    let topLevelCount = 0;
    return headers
      .filter((heading) => heading.level < minDepth + MAX_LEVEL)
      .map((heading) => {
        const relative = heading.level - minDepth;
        return {
          ...heading,
          relative,
          number: relative === 0 ? ++topLevelCount : 0,
          text: removeTailingHash(heading.text),
        };
      });
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

  const jumpToHeading = useJumpToHeading();
  const jumpTo = useCallback(
    async (id: string) => {
      anchorTarget.current = id;
      await jumpToHeading(id, () => anchorTarget.current === id);
      window.setTimeout(() => {
        if (anchorTarget.current === id) {
          anchorTarget.current = null;
        }
      }, 600);
    },
    [jumpToHeading],
  );

  if (visibleHeaders.length === 0) return null;
  const toc = (
    <nav
      className={cn(
        // The portal must sit above the full-width public content wrapper (z-30).
        "hidden 2xl:block fixed top-14 z-40 pl-4 transition duration-300",
        isVisible && isReady ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      style={{
        left: left ?? 0,
        width:
          "var(--fuwari-toc-width, calc((100vw - var(--fuwari-page-width)) / 2 - 1rem))",
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
                if (isPlainClick(e)) {
                  e.preventDefault();
                  void jumpTo(heading.id);
                }
              }}
              className={cn(
                "px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl py-2 z-10",
                "hover:bg-(--fuwari-toc-btn-hover) active:bg-(--fuwari-toc-btn-active)",
              )}
            >
              <TocBadge heading={heading} />
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
      {!isSSR && left != null
        ? createPortal(
            <>
              {toc}
              <CompactToc
                headers={visibleHeaders}
                activeIndices={activeIndices}
                shown={isVisible && isReady}
                onSelect={(id) => void jumpTo(id)}
              />
            </>,
            document.body,
          )
        : null}
    </>
  );
}

type VisibleHeader = TableOfContentsItem & {
  relative: number;
  number: number;
};

function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

function TocBadge({ heading }: { heading: VisibleHeader }) {
  return (
    <div
      className={cn(
        "transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold",
        heading.relative === 0 &&
          "bg-(--fuwari-toc-badge-bg) text-(--fuwari-btn-content)",
        heading.relative === 1 && "ml-4",
        heading.relative === 2 && "ml-8",
      )}
    >
      {heading.relative === 0 && heading.number}
      {heading.relative === 1 && (
        <div className="transition w-2 h-2 rounded-[0.1875rem] bg-(--fuwari-toc-badge-bg)" />
      )}
      {heading.relative === 2 && (
        <div className="transition w-1.5 h-1.5 rounded-sm bg-black/5 dark:bg-white/10" />
      )}
    </div>
  );
}

/**
 * Below 2xl the side TOC has no room, so a button in the floating column
 * opens it instead.
 */
function CompactToc({
  headers,
  activeIndices,
  shown,
  onSelect,
}: {
  headers: Array<VisibleHeader>;
  activeIndices: Array<number>;
  shown: boolean;
  onSelect: (id: string) => void;
}) {
  const slot = useFloatingActionsSlot();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Held in state: the popover mounts its children after `open` flips.
  const [links, setLinks] = useState<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });

  useEffect(() => {
    if (!shown) setOpen(false);
  }, [shown]);

  // Written straight to the button so scrolling does not re-render.
  useEffect(() => {
    const update = () => {
      const button = buttonRef.current;
      const content = document.querySelector(".fuwari-custom-md");
      if (!button || !content) return;
      const rect = content.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress =
        scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 1;
      button.style.setProperty("--progress", String(progress));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [slot]);

  useLayoutEffect(() => {
    if (!links) return;
    const items = links.querySelectorAll<HTMLElement>("a[data-active]");
    const first = items[0];
    const last = items[items.length - 1];
    setIndicator(
      first && last
        ? {
            top: first.offsetTop,
            height: last.offsetTop + last.offsetHeight - first.offsetTop,
          }
        : { top: 0, height: 0 },
    );
  }, [links, activeIndices]);

  return (
    <>
      {slot
        ? createPortal(
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={m.post_toc()}
              aria-expanded={open}
              className={cn(
                FLOATING_ACTION_BUTTON_CLASS,
                "fuwari-progress-ring 2xl:hidden duration-300",
                shown
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-90 pointer-events-none",
              )}
            >
              <TocIcon className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={2.5} />
            </button>,
            slot,
          )
        : null}
      <FloatingPopover
        open={open}
        anchor={open ? buttonRef.current : null}
        onDismiss={() => setOpen(false)}
        placement="top-end"
        // Focusing the current section scrolls it into view.
        initialFocus={() =>
          listRef.current?.querySelector<HTMLElement>("[data-active]") ??
          listRef.current?.querySelector<HTMLElement>("a") ??
          null
        }
        className="2xl:hidden w-[min(20rem,calc(100vw-2rem))]"
      >
        <nav aria-label={m.post_toc()}>
          <div
            ref={listRef}
            className="fuwari-hide-scrollbar max-h-[60vh] overflow-y-auto p-2"
          >
            <div ref={setLinks} className="group relative flex flex-col">
              {headers.map((heading, index) => {
                const active = activeIndices.includes(index);
                return (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    data-active={active || undefined}
                    onClick={(e) => {
                      if (!isPlainClick(e)) return;
                      e.preventDefault();
                      setOpen(false);
                      onSelect(heading.id);
                    }}
                    className={cn(
                      "px-2 flex gap-2 relative z-10 w-full min-h-10 rounded-xl py-2.5 outline-none transition",
                      "hover:bg-(--fuwari-toc-btn-hover) active:bg-(--fuwari-toc-btn-active) focus-visible:bg-(--fuwari-toc-btn-hover)",
                    )}
                  >
                    <TocBadge heading={heading} />
                    <div
                      className={cn(
                        "transition text-sm",
                        heading.relative === 2
                          ? "fuwari-text-30"
                          : "fuwari-text-50",
                      )}
                    >
                      {heading.text}
                    </div>
                  </a>
                );
              })}
              {/* The same range indicator as the side TOC. */}
              <div
                className="absolute left-0 right-0 rounded-xl transition-all bg-(--fuwari-toc-btn-hover) border-2 border-dashed border-(--fuwari-toc-btn-hover) group-hover:bg-transparent group-hover:border-(--fuwari-toc-btn-active) pointer-events-none"
                style={{
                  top: indicator.top,
                  height: indicator.height,
                  opacity: indicator.height > 0 ? 1 : 0,
                }}
              />
            </div>
          </div>
        </nav>
      </FloatingPopover>
    </>
  );
}
