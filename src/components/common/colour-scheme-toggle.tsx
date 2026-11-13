import { Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";
import { flushSync } from "react-dom";
import type { ColourSchemePreference } from "@/components/common/colour-scheme-provider";
import { useColourScheme } from "@/components/common/colour-scheme-provider";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const colourSchemePreferences: Array<ColourSchemePreference> = [
  "light",
  "dark",
  "system",
];

export function ColourSchemeToggle({
  className,
  label,
}: {
  className?: string;
  label?: React.ReactNode;
}) {
  const { colourSchemePreference, setColourScheme } = useColourScheme();
  const ref = React.useRef<HTMLButtonElement>(null);
  const schemeLabel =
    colourSchemePreference === "light"
      ? m.colour_scheme_light()
      : colourSchemePreference === "dark"
        ? m.colour_scheme_dark()
        : m.colour_scheme_system();

  const toggleColourScheme = async () => {
    const currentIndex = colourSchemePreferences.indexOf(
      colourSchemePreference,
    );
    const nextPreference =
      colourSchemePreferences[
        (currentIndex + 1) % colourSchemePreferences.length
      ];

    // Fallback if View Transitions API is not supported
    const isReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!ref.current || !document.startViewTransition || isReducedMotion) {
      setColourScheme(nextPreference);
      return;
    }

    const button = ref.current;
    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.classList.add("colour-scheme-transition");

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setColourScheme(nextPreference);
      });
    });

    // A skipped transition (e.g. a second click mid-animation) rejects `ready`;
    // there is nothing to animate then.
    transition.ready
      .then(() => {
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
      })
      .catch(() => {});

    void transition.finished.finally(() => {
      document.documentElement.classList.remove("colour-scheme-transition");
    });
  };

  return (
    <button
      ref={ref}
      onClick={toggleColourScheme}
      className={cn(
        "p-2 text-muted-foreground hover:text-foreground transition-colors duration-300",
        className,
      )}
      title={m.colour_scheme_toggle_title({ scheme: schemeLabel })}
      aria-label={m.colour_scheme_toggle_title({ scheme: schemeLabel })}
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
      {label}
    </button>
  );
}
