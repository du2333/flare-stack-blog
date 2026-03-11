import { Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";
import { flushSync } from "react-dom";
import type { UserTheme } from "@/components/common/theme-provider";
import { useTheme } from "@/components/common/theme-provider";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const themes: Array<UserTheme> = ["light", "dark", "system"];

export function ThemeToggle({ className }: { className?: string }) {
  const { userTheme, setTheme } = useTheme();
  const ref = React.useRef<HTMLButtonElement>(null);
  const themeLabel =
    userTheme === "light"
      ? m.theme_light()
      : userTheme === "dark"
        ? m.theme_dark()
        : m.theme_system();

  const toggleTheme = async () => {
    const currentIndex = themes.indexOf(userTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];

    // Fallback if View Transitions API is not supported
    const isReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!ref.current || !document.startViewTransition || isReducedMotion) {
      setTheme(nextTheme);
      return;
    }

    const button = ref.current;
    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.classList.add("theme-transition");

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
      });
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("theme-transition");
    });
  };

  return (
    <button
      ref={ref}
      onClick={toggleTheme}
      className={cn(
        "p-2 text-muted-foreground hover:text-foreground transition-colors duration-300",
        className,
      )}
      title={m.theme_toggle_title({ theme: themeLabel })}
      aria-label={m.theme_toggle_title({ theme: themeLabel })}
    >
      <div className="relative flex items-center justify-center w-4 h-4">
        {/* Light Mode Icon */}
        <span className="hidden [.light:not(.system)_&]:block">
          <Sun size={14} strokeWidth={1.5} />
        </span>

        {/* Dark Mode Icon */}
        <span className="hidden [.dark:not(.system)_&]:block">
          <Moon size={14} strokeWidth={1.5} />
        </span>

        {/* System Mode Icon */}
        <span className="hidden in-[.system]:block">
          <Monitor size={14} strokeWidth={1.5} />
        </span>
      </div>
    </button>
  );
}
