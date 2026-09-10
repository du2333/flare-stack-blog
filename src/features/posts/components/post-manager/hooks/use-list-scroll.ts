import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import { LOW_WORKSPACE_HEIGHT } from "@/components/admin/content-workspace";
import { useMediaQuery } from "@/hooks/use-motion";
import {
  readPostListPosition,
  savePostListLocation,
  savePostListPosition,
  type ListScrollPosition,
  type PostListLocation,
} from "../list-position";

export function useListScroll(
  ref: RefObject<HTMLDivElement | null>,
  location: PostListLocation,
  ready: boolean,
) {
  const lowHeight = useMediaQuery(LOW_WORKSPACE_HEIGHT);
  const key = JSON.stringify(location);
  const applied = useRef<string | null>(null);
  const pending = useRef<{ key: string; position: ListScrollPosition } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current)
      savePostListPosition(pending.current.key, pending.current.position);
    pending.current = null;
  }, []);
  const current = useRef({ key, ready });
  current.current = { key, ready };
  const getScroller = useCallback(
    () =>
      lowHeight
        ? ref.current?.closest<HTMLElement>(".admin-list-region")
        : ref.current,
    [ref, lowHeight],
  );

  useEffect(() => {
    savePostListLocation(location);
  }, [key]);
  useLayoutEffect(() => {
    const scroller = getScroller();
    if (!scroller || !ready || applied.current === key) return;
    flush();
    const position =
      applied.current === null
        ? readPostListPosition(key)
        : { top: 0, left: 0 };
    applied.current = key;
    scroller.scrollTop = position.top;
    scroller.scrollLeft = position.left;
    savePostListPosition(key, {
      top: scroller.scrollTop,
      left: scroller.scrollLeft,
    });
  }, [getScroller, key, ready, flush]);
  useEffect(() => {
    const scroller = getScroller();
    if (!scroller) return;
    const save = () => {
      if (!current.current.ready || applied.current !== current.current.key)
        return;
      pending.current = {
        key: current.current.key,
        position: { top: scroller.scrollTop, left: scroller.scrollLeft },
      };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 120);
    };
    scroller.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", flush);
    return () => {
      scroller.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [getScroller, flush]);
}
