import { useLayoutEffect, type RefObject } from "react";
import { useReducedMotion } from "@/hooks/use-motion";

// Keep the inspector's presence aligned with --media-layout-duration in CSS.
export const MEDIA_LAYOUT_DURATION = 420;

/** Animate only column-count changes; ordinary width interpolation stays in CSS. */
export function useMediaGridMotion(
  ref: RefObject<HTMLDivElement | null>,
  contentKey: string,
) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid || reduced) return;
    const read = () =>
      Array.from(
        grid.querySelectorAll<HTMLButtonElement>(".media-gallery-item"),
        (element) => ({
          element,
          x: element.offsetLeft,
          y: element.offsetTop,
        }),
      );
    const columnCount = () =>
      getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    let previous = read();
    let columns = columnCount();
    const animations = new Map<HTMLElement, Animation>();
    const observer = new ResizeObserver(() => {
      const nextColumns = columnCount();
      const next = read();
      if (nextColumns !== columns) {
        const oldByElement = new Map(
          previous.map((item) => [item.element, item]),
        );
        const moves = next.map((item) => {
          const old = oldByElement.get(item.element);
          if (!old) return null;
          const matrix = new DOMMatrixReadOnly(
            getComputedStyle(item.element).transform,
          );
          return {
            item,
            x: old.x - item.x + matrix.e,
            y: old.y - item.y + matrix.f,
          };
        });
        for (const move of moves) {
          if (!move) continue;
          const { item, x, y } = move;
          animations.get(item.element)?.cancel();
          animations.set(
            item.element,
            item.element.animate(
              [
                {
                  transform: `translate(${x}px, ${y}px)`,
                },
                {
                  transform: "translate(0, 0)",
                },
              ],
              {
                duration: 320,
                easing: "cubic-bezier(0.25, 0.8, 0.25, 1)",
              },
            ),
          );
        }
      }
      previous = next;
      columns = nextColumns;
    });
    observer.observe(grid);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [ref, contentKey, reduced]);
}
