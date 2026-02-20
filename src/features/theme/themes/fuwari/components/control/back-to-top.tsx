import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Same logic as original Fuwari: show after banner height
      // The current Fuwari banner logic sets banner to ~35vh or 65vh, let's use 35vh as base threshold
      const bannerHeight = window.innerHeight * 0.35;
      setIsVisible(window.scrollY > bannerHeight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="hidden lg:block absolute right-0 top-0 w-15 h-15 pointer-events-none">
      <div
        className={cn(
          "fixed bottom-40 flex items-center rounded-2xl overflow-hidden transition-all duration-300 pointer-events-auto",
          isVisible
            ? "opacity-100 translate-x-20 scale-100"
            : "opacity-0 translate-x-20 scale-90 pointer-events-none",
        )}
      >
        <button
          onClick={scrollToTop}
          aria-label="Back to Top"
          className="flex items-center justify-center w-15 h-15 fuwari-card-base hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) text-(--fuwari-primary) text-2xl font-bold transition-all active:scale-90 shadow-md"
        >
          <ArrowUp className="w-7 h-7" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
