import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  FLOATING_ACTION_BUTTON_CLASS,
  FLOATING_ACTION_ICON_CLASS,
  useFloatingActionsSlotRef,
} from "./floating-actions";

/** How far the page moves one way before the column takes it as a turn. */
const SCROLL_TURN_PX = 8;

export function BackToTop() {
  const setSlot = useFloatingActionsSlotRef();
  const [isVisible, setIsVisible] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      // A fixed share of the viewport, the same in every Theme Shell: it says
      // "the reader has scrolled", not "the first screen is gone".
      setIsVisible(y > window.innerHeight * 0.35);

      // Which way the reader is going, written straight to the column so
      // scrolling does not re-render. Below lg the column lies on the text,
      // and back to top is there only while they scroll back (the class
      // names below); keyboard focus on it keeps it.
      if (Math.abs(y - last) < SCROLL_TURN_PX) return;
      const column = columnRef.current;
      const held = column?.querySelector(":focus-visible") != null;
      column?.toggleAttribute("data-reading", y > last && !held);
      last = y;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      ref={columnRef}
      className={cn(
        // Below lg the page's actions (the contents of a Post) keep the
        // corner, where they stay, and back to top comes and goes above
        // them, so nothing moves when it does.
        "group/floating fuwari-floating-actions z-40 transition-all duration-300 max-lg:flex-col-reverse",
        isVisible
          ? "opacity-100 scale-100"
          : "opacity-0 scale-90 pointer-events-none",
      )}
    >
      {/* Page actions, such as the post TOC, stack above from lg. */}
      <div ref={setSlot} className="contents" />
      <button
        onClick={scrollToTop}
        aria-label={m.post_back_to_top()}
        className={cn(
          FLOATING_ACTION_BUTTON_CLASS,
          "max-lg:group-data-reading/floating:pointer-events-none max-lg:group-data-reading/floating:translate-y-2 max-lg:group-data-reading/floating:opacity-0",
        )}
      >
        <ArrowUp className={FLOATING_ACTION_ICON_CLASS} strokeWidth={2.5} />
      </button>
    </div>
  );
}
