import type { CSSProperties } from "react";

/**
 * The style that places an element in its page's rise-in order: with the
 * class `admin-rise` (admin-shell.css), the head, the bar and the cards rise
 * in one after another.
 */
export function riseOrder(index: number) {
  return { "--i": index } as CSSProperties;
}
