import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  FLOATING_ACTION_BUTTON_CLASS,
  useFloatingActionsSlotRef,
} from "./floating-actions";

export function BackToTop() {
  const setSlot = useFloatingActionsSlotRef();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // A fixed share of the viewport, the same in every Theme Shell: it says
      // "the reader has scrolled", not "the first screen is gone".
      setIsVisible(window.scrollY > window.innerHeight * 0.35);
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
      className={cn(
        "fuwari-floating-actions z-40 transition-all duration-300",
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
        <ArrowUp className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={2.5} />
      </button>
    </div>
  );
}
