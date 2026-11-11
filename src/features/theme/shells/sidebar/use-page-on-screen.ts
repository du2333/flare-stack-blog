import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { PageKind } from "@/features/theme/theme-shell";

/**
 * How far below `main` the page stands: `main`, the transition around the
 * page, the element it keys by the page, then the page itself. A change of
 * children that near `main` is a page that came or went; anything deeper is
 * the page's own business.
 */
const PAGE_DEPTH = 2;

function depthBelow(ancestor: Node, node: Node): number {
  let depth = 0;
  for (let at: Node | null = node; at && at !== ancestor; at = at.parentNode) {
    depth += 1;
  }
  return depth;
}

/**
 * The kind of the page that is on screen, and whether a Post's page was on
 * either side of the last change of it.
 *
 * `pageKind` is the kind of the page the address names. It changes as soon
 * as a navigation starts, while `main` still holds the page that is left:
 * the next page is rendered a moment later, and where its data is not at
 * hand yet, a good deal later. 「侧栏」 lays a Post's page out apart from
 * every other (no banner, a reading column), so a layout that followed the
 * address would show the page that is left in the layout of the next one
 * for those frames. The kind returned here changes in the frame the page in
 * `main` is replaced, whichever page fade is under way then: the element
 * that holds the page gets other children, and the shell is rendered again
 * before that is painted. When the router has settled and nothing was
 * replaced, the address is taken at its word.
 *
 * `swapped` tells what stands above the page (the banner, the headline) to
 * come or go at once rather than fold, because the column changes width in
 * the same frame.
 */
export function usePageOnScreen(
  pageKind: PageKind,
  mainRef: RefObject<HTMLElement | null>,
): { page: PageKind; swapped: boolean } {
  const [page, setPage] = useState(pageKind);
  const named = useRef(pageKind);
  named.current = pageKind;

  useEffect(() => {
    const main = mainRef.current;
    if (!main || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver((records) => {
      const replaced = records.some(
        (record) => depthBelow(main, record.target) <= PAGE_DEPTH,
      );
      if (replaced) flushSync(() => setPage(named.current));
    });
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mainRef]);

  // The page is rendered in the frame the router settles or the one after,
  // so the address is not taken at its word before that.
  const settled = useRouterState({
    select: (state) => state.status === "idle",
  });
  useEffect(() => {
    if (!settled || page === pageKind) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPage(pageKind));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [page, pageKind, settled]);

  const [last, setLast] = useState({ page, before: page });
  if (page !== last.page) setLast({ page, before: last.page });
  const before = page === last.page ? last.before : last.page;
  return { page, swapped: page === "post" || before === "post" };
}
