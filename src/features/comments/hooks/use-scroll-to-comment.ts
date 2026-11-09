import { useEffect } from "react";

const SETTLE_MS = 300;
const GIVE_UP_MS = 10_000;

/**
 * Keep an element aligned in the viewport while the page above it settles,
 * until its position has stopped moving for a moment (ADR 0015).
 */
export function useSettledScroll(
  elementId: string | undefined,
  block: ScrollLogicalPosition,
) {
  useEffect(() => {
    if (elementId == null) return;

    const startedAt = Date.now();
    let lastTop: number | null = null;
    let lastChangeAt = Date.now();
    let frame = 0;
    let stopped = false;

    const align = (element: HTMLElement) => {
      element.scrollIntoView({ behavior: "auto", block });
    };

    const tick = () => {
      if (stopped) return;
      const element = document.getElementById(elementId);
      const now = Date.now();

      if (!element) {
        if (now - startedAt > GIVE_UP_MS) return;
        frame = requestAnimationFrame(tick);
        return;
      }

      const top = element.getBoundingClientRect().top;
      if (lastTop == null || Math.abs(top - lastTop) >= 1) {
        align(element);
        lastChangeAt = now;
        lastTop = element.getBoundingClientRect().top;
      }

      if (now - lastChangeAt >= SETTLE_MS) return;
      if (now - startedAt > GIVE_UP_MS) return;
      frame = requestAnimationFrame(tick);
    };

    const observer = new ResizeObserver(() => {
      lastTop = null;
    });
    observer.observe(document.documentElement);
    frame = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [elementId, block]);
}

export function useScrollToComment(commentId: number | undefined) {
  useSettledScroll(
    commentId == null ? undefined : `comment-${commentId}`,
    "center",
  );
}
