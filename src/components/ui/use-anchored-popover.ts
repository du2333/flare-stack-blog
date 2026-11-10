import type { CSSProperties } from "react";

/** The small pill trigger of the code block's language picker. */
export const POPOVER_TRIGGER_CLASS =
  "flex items-center gap-1 rounded-lg bg-(--theme-accent)/10 px-2 py-0.5 font-mono text-xs font-bold uppercase text-(--theme-accent)";

/** Card surface for a popover portalled to the body. */
export const POPOVER_PANEL_CLASS =
  "fuwari-popover-motion z-80 rounded-xl bg-(--theme-raised) shadow-md ring-1 ring-(--fuwari-input-border)";

/**
 * Where a popover's open and close motion grows from: the anchor-side corner
 * on `edge`, for a popover placed `above` or below its anchor.
 */
export function popoverMotionOrigin(
  above: boolean,
  edge: "left" | "right",
): CSSProperties {
  return {
    transformOrigin: `${above ? "bottom" : "top"} ${edge}`,
    "--popover-offset": above ? "4px" : "-4px",
  } as CSSProperties;
}
