import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

// Keep these lifecycle delays aligned with styles/motion.css.
export const MOTION = {
  popover: 120,
  modal: 200,
  panel: 320,
  content: 180,
} as const;

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    useCallback(
      (callback: () => void) => {
        const media = window.matchMedia(query);
        media.addEventListener("change", callback);
        return () => media.removeEventListener("change", callback);
      },
      [query],
    ),
    () => window.matchMedia(query).matches,
    () => false,
  );
}
export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** Exit remains mounted, but callers must mark the exiting surface inert. */
export function useMotionPresence(open: boolean, duration: number) {
  const reduced = useReducedMotion();
  const [retained, setRetained] = useState(open);
  useEffect(() => {
    if (open) {
      setRetained(true);
      return;
    }
    if (reduced) {
      setRetained(false);
      return;
    }
    const timer = window.setTimeout(() => setRetained(false), duration);
    return () => window.clearTimeout(timer);
  }, [open, duration, reduced]);
  return open || (!reduced && retained);
}

/** Animate a committed content change without delaying data, input or focus. */
export function useContentMotion(
  ref: RefObject<HTMLElement | null>,
  key: string,
  initial = false,
) {
  const reduced = useReducedMotion();
  const previous = useRef<string | null>(null);
  useLayoutEffect(() => {
    const changed = previous.current !== key;
    const first = previous.current === null;
    previous.current = key;
    if (!changed || (first && !initial) || reduced) return;
    const animation = ref.current?.animate(
      [
        { opacity: 0.25, transform: "translateY(4px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: MOTION.content, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    return () => animation?.cancel();
  }, [key, ref, initial, reduced]);
}
