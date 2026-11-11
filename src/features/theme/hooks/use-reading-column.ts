import { useEffect, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { PAGE_FADE_MS } from "@/components/layout/page-fade";
import { useReducedMotion } from "@/hooks/use-motion";

/**
 * Whether the shell's column is the reading column of a Post, for a shell
 * that lays a Post's page out apart from the other pages (pass it
 * `pageKind === "post"` and the region that holds `children`). Use it, not
 * `pageKind`, for anything that must change with the page on screen.
 *
 * `PageFade` keeps the page that is left for `PAGE_FADE_MS` while it fades
 * out, and the column waits with it, so neither page is seen at the width
 * of the other. It changes in the frame the next page comes in: the
 * transition around the page (the one element of `main`) drops the class it
 * fades out under in the commit that swaps the pages, and the column follows
 * before that is painted. A timer of its own could fire a frame early, while
 * the page that is left can still be seen; it only stands in where nothing
 * tells. A reader who asked for less motion gets no fade and no wait.
 */
export function useReadingColumn(
  post: boolean,
  mainRef: RefObject<HTMLElement | null>,
): boolean {
  const reducedMotion = useReducedMotion();
  const [reading, setReading] = useState(post);
  useEffect(() => {
    if (reading === post) return;
    if (reducedMotion) {
      setReading(post);
      return;
    }
    const timer = window.setTimeout(() => setReading(post), PAGE_FADE_MS);
    const transition = mainRef.current?.firstElementChild;
    if (!transition || typeof MutationObserver === "undefined") {
      return () => window.clearTimeout(timer);
    }
    // It takes that class a commit after the address has changed, which is
    // not the moment: only a class that goes is.
    const observer = new MutationObserver((records) => {
      const dropped = records.some(
        ({ oldValue }) => (oldValue ?? "").length > transition.className.length,
      );
      if (!dropped) return;
      observer.disconnect();
      flushSync(() => setReading(post));
    });
    observer.observe(transition, {
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
    });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [mainRef, post, reading, reducedMotion]);
  return reducedMotion ? post : reading;
}
