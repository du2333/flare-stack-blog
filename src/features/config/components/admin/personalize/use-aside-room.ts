import { useLayoutEffect, type RefObject } from "react";

/**
 * Sizes a sticky panel to the room the page's scroller has: as tall as the
 * scroller shows, less its padding above and below and the save bar when that
 * is up. A sticky `top` counts from inside the scroller's padding, so with
 * `top: 0` the panel starts level with the form's first field and ends a page
 * margin above the window's edge.
 */
export function useAsideRoom(
  ref: RefObject<HTMLElement | null>,
  scrollerSelector = ".settings-body",
) {
  useLayoutEffect(() => {
    const aside = ref.current;
    const scroller = aside?.closest<HTMLElement>(scrollerSelector);
    if (!aside || !scroller) return;

    const observed = new Set<Element>();
    const resizes = new ResizeObserver(() => update());
    function update() {
      const pad = parseFloat(getComputedStyle(scroller!).paddingTop) || 0;
      const bar = scroller!.querySelector<HTMLElement>(
        ":scope > .settings-savebar",
      );
      if (bar && !observed.has(bar)) {
        observed.add(bar);
        resizes.observe(bar);
      }
      const room = scroller!.clientHeight - pad * 2 - (bar?.offsetHeight ?? 0);
      aside!.style.height = `${Math.max(320, Math.round(room))}px`;
    }
    update();
    resizes.observe(scroller);
    // The save bar comes and goes as a child of the scroller.
    const children = new MutationObserver(update);
    children.observe(scroller, { childList: true });
    return () => {
      resizes.disconnect();
      children.disconnect();
    };
  }, [ref, scrollerSelector]);
}
