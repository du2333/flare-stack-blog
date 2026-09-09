import { useLayoutEffect, type RefObject } from "react";
import { MOTION, useReducedMotion } from "@/hooks/use-motion";

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
          width: element.offsetWidth,
          height: element.offsetHeight,
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
          if (!old || !item.width || !item.height) return null;
          const matrix = new DOMMatrixReadOnly(
            getComputedStyle(item.element).transform,
          );
          return {
            item,
            x: old.x - item.x + matrix.e,
            y: old.y - item.y + matrix.f,
            sx: (old.width / item.width) * matrix.a,
            sy: (old.height / item.height) * matrix.d,
          };
        });
        for (const move of moves) {
          if (!move) continue;
          const { item, x, y, sx, sy } = move;
          animations.get(item.element)?.cancel();
          animations.set(
            item.element,
            item.element.animate(
              [
                {
                  transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})`,
                  transformOrigin: "top left",
                },
                {
                  transform: "translate(0, 0) scale(1)",
                  transformOrigin: "top left",
                },
              ],
              {
                duration: MOTION.content,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
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
