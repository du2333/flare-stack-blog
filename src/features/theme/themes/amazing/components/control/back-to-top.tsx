import { ArrowUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * Elastic Back-to-Top — Amazing Theme
 *
 * Features:
 * - SVG progress ring showing scroll percentage
 * - Elastic bounce entrance from bottom
 * - Arrow bouncing animation on hover
 * - Rocket-launch effect on click
 * - Glow shadow on hover
 */
export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const bannerHeight = window.innerHeight * 0.35;
      setIsVisible(window.scrollY > bannerHeight);

      // Calculate scroll progress
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? window.scrollY / totalHeight : 0;
      setScrollProgress(Math.min(progress, 1));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    setIsLaunching(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setIsLaunching(false), 600);
    }, 200);
  }, []);

  // SVG circle metrics
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - scrollProgress);

  return (
    <div className="hidden lg:block absolute right-0 top-0 w-15 h-15 pointer-events-none">
      <div
        className={cn(
          "fixed bottom-40 flex items-center rounded-2xl overflow-visible transition-all duration-500 pointer-events-auto",
          isVisible
            ? "opacity-100 translate-x-20 scale-100"
            : "opacity-0 translate-x-20 scale-75 pointer-events-none",
          isLaunching && "animate-[amazing-rocket-launch_0.5s_ease-out_forwards]",
        )}
        style={{
          transitionTimingFunction: isVisible
            ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <button
          onClick={scrollToTop}
          aria-label={m.post_back_to_top()}
          className="relative flex items-center justify-center w-15 h-15 fuwari-card-base hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) text-(--fuwari-primary) transition-all active:scale-90 shadow-md hover:shadow-[0_4px_24px_rgba(var(--amazing-primary-rgb),0.3)] group"
        >
          {/* Progress ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            viewBox="0 0 56 56"
          >
            {/* Background circle */}
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              strokeWidth="2"
              className="stroke-black/5 dark:stroke-white/5"
            />
            {/* Progress circle */}
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              stroke="rgb(var(--amazing-primary-rgb))"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-200"
            />
          </svg>

          {/* Arrow icon with bounce on hover */}
          <ArrowUp
            className="w-6 h-6 transition-transform group-hover:animate-[amazing-arrow-bounce_0.6s_ease-in-out_infinite]"
            strokeWidth={2.5}
          />
        </button>
      </div>
    </div>
  );
}
