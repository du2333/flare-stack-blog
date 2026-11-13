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
      // scrolling does not re-render. Below lg the column lies on the text
      // and steps aside while they read on (the class names below); an open
      // list or keyboard focus in it keeps it.
      if (Math.abs(y - last) < SCROLL_TURN_PX) return;
      const column = columnRef.current;
      const held =
        column?.querySelector(':focus-visible, [aria-expanded="true"]') != null;
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
        "fuwari-floating-actions z-40 transition-all duration-300",
        "max-lg:data-reading:translate-y-3 max-lg:data-reading:opacity-0 max-lg:data-reading:pointer-events-none",
        isVisible
          ? "opacity-100 scale-100"
          : "opacity-0 scale-90 pointer-events-none",
      )}
    >
      {/* Page actions, such as the post TOC, stack above. */}
      <div ref={setSlot} className="contents" />
      <button
        onClick={scrollToTop}
        aria-label={m.post_back_to_top()}
        className={FLOATING_ACTION_BUTTON_CLASS}
      >
        <ArrowUp className={FLOATING_ACTION_ICON_CLASS} strokeWidth={2.5} />
      </button>
    </div>
  );
}
