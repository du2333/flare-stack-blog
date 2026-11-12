import { useLayoutEffect, type RefObject } from "react";
import { useReducedMotion } from "@/hooks/use-motion";

// How long the detail panel takes to come and go (media-library.css).
export const MEDIA_LAYOUT_DURATION = 320;

interface Box {
  element: HTMLElement;
  x: number;
  y: number;
  width: number;
}

/**
 * The wall's tiles glide to their new places when its rows break
 * differently, as when the detail panel opens beside it. A resize that
 * keeps every tile on its row is left to the layout.
 */
export function useMediaGridMotion(
  ref: RefObject<HTMLDivElement | null>,
  contentKey: string,
) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid || reduced) return;
    const read = (): Array<Box> =>
      Array.from(
        grid.querySelectorAll<HTMLElement>(".media-gallery-item"),
        (element) => ({
          element,
          x: element.offsetLeft,
          y: element.offsetTop,
          width: element.offsetWidth,
        }),
      );
    let previous = read();
    const animations = new Map<HTMLElement, Animation>();
    const observer = new ResizeObserver(() => {
      const next = read();
      const before = new Map(previous.map((box) => [box.element, box]));
      const rebroken = next.some((box) => {
        const old = before.get(box.element);
        return old !== undefined && old.y !== box.y;
      });
      if (rebroken)
        for (const box of next) {
          const old = before.get(box.element);
          if (!old || !box.width) continue;
          animations.get(box.element)?.cancel();
          animations.set(
            box.element,
            box.element.animate(
              [
                {
                  transformOrigin: "0 0",
                  transform: `translate(${old.x - box.x}px, ${old.y - box.y}px) scaleX(${old.width / box.width})`,
                },
                { transformOrigin: "0 0", transform: "none" },
              ],
              {
                duration: MEDIA_LAYOUT_DURATION,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              },
            ),
          );
        }
      previous = next;
    });
    observer.observe(grid);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [ref, contentKey, reduced]);
}
