import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import { LOW_WORKSPACE_HEIGHT } from "@/components/admin/content-workspace";
import { useMediaQuery, useReducedMotion } from "@/hooks/use-motion";

function layoutTop(element: HTMLElement) {
  let top = 0;
  let node: HTMLElement | null = element;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

/** Keep a visible image in context across representation/inspector changes. */
export function useMediaScroll(
  ref: RefObject<HTMLDivElement | null>,
  layoutKey: string,
  filterKey: string,
) {
  const lowHeight = useMediaQuery(LOW_WORKSPACE_HEIGHT);
  const reduced = useReducedMotion();
  const anchor = useRef<{ key: string; offset: number } | null>(null);
  const oldFilter = useRef(filterKey);
  const getScroller = useCallback(
    () =>
      lowHeight
        ? ref.current?.closest<HTMLElement>(".admin-list-region")
        : ref.current,
    [ref, lowHeight],
  );
  const capture = (preferredKey?: string) => {
    const scroller = getScroller();
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    const items = Array.from(
      ref.current?.querySelectorAll<HTMLElement>("[data-media-key]") ?? [],
    );
    const visible = items.filter((item) => {
      const box = item.getBoundingClientRect();
      return box.bottom > rect.top && box.top < rect.bottom;
    });
    const item =
      visible.find((item) => item.dataset.mediaKey === preferredKey) ??
      visible[0];
    anchor.current = item
      ? {
          key: item.dataset.mediaKey!,
          offset: item.getBoundingClientRect().top - rect.top,
        }
      : null;
  };
  useLayoutEffect(() => {
    if (oldFilter.current === filterKey) return;
    oldFilter.current = filterKey;
    anchor.current = null;
    const scroller = getScroller();
    if (scroller) {
      scroller.scrollTop = 0;
      scroller.scrollLeft = 0;
    }
  }, [filterKey, getScroller]);
  useLayoutEffect(() => {
    if (!anchor.current) return;
    let cancelled = false;
    let firstFrame = 0;
    let finalFrame = 0;
    const restore = () => {
      const saved = anchor.current;
      anchor.current = null;
      const scroller = getScroller();
      if (cancelled || !saved || !scroller) return;
      const item = Array.from(
        ref.current?.querySelectorAll<HTMLElement>("[data-media-key]") ?? [],
      ).find((item) => item.dataset.mediaKey === saved.key);
      if (!item) return;
      // Finish pending reflow transforms before applying the scroll correction.
      ref.current
        ?.querySelectorAll<HTMLElement>(".media-gallery-item")
        .forEach((element) =>
          element.getAnimations().forEach((animation) => animation.cancel()),
        );
      scroller.scrollTop = layoutTop(item) - layoutTop(scroller) - saved.offset;
    };
    const settle = () => {
      if (cancelled) return;
      // ResizeObserver runs after layout; give its final reflow a frame to land.
      firstFrame = requestAnimationFrame(() => {
        finalFrame = requestAnimationFrame(restore);
      });
    };
    const transitions = reduced
      ? []
      : (ref.current?.closest(".media-workspace-body")?.getAnimations() ?? []);
    void Promise.all(
      transitions.map((animation) => animation.finished.catch(() => {})),
    ).then(settle);
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(finalFrame);
    };
  }, [layoutKey, reduced, getScroller, ref]);
  useEffect(() => {
    const scroller = getScroller();
    if (!scroller) return;
    const cancel = () => {
      anchor.current = null;
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(
          event.key,
        )
      )
        cancel();
    };
    scroller.addEventListener("wheel", cancel, { passive: true });
    scroller.addEventListener("touchstart", cancel, { passive: true });
    scroller.addEventListener("keydown", keydown);
    return () => {
      scroller.removeEventListener("wheel", cancel);
      scroller.removeEventListener("touchstart", cancel);
      scroller.removeEventListener("keydown", keydown);
    };
  }, [getScroller]);
  return capture;
}
