import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useReducedMotion } from "@/hooks/use-motion";

export function useNavSort(
  ids: string[],
  move: (from: number, to: number) => void,
) {
  const rows = useRef(new Map<string, HTMLDivElement>());
  const positions = useRef(new Map<string, DOMRect>());
  const gesture = useRef<{
    id: string;
    start: number;
    target: string;
    offset: number;
    active: boolean;
  } | null>(null);
  const [drag, setDrag] = useState<typeof gesture.current>(null);
  const reduced = useReducedMotion();
  const order = ids.join(",");
  useLayoutEffect(() => {
    if (!reduced)
      for (const [id, node] of rows.current) {
        const before = positions.current.get(id);
        if (!before) continue;
        const delta = before.top - node.getBoundingClientRect().top;
        if (delta)
          node.animate(
            [
              { transform: `translateY(${delta}px)` },
              { transform: "translateY(0)" },
            ],
            { duration: 300, easing: "cubic-bezier(.22,1,.36,1)" },
          );
      }
    positions.current.clear();
  }, [order, reduced]);
  const reorder = (id: string, target: string) => {
    const from = ids.indexOf(id),
      to = ids.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    positions.current = new Map(
      [...rows.current].map(([key, node]) => [
        key,
        node.getBoundingClientRect(),
      ]),
    );
    move(from, to);
  };
  const cancel = () => {
    gesture.current = null;
    setDrag(null);
  };
  return {
    rows,
    drag,
    handleProps: (id: string) => ({
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || ids.length < 2) return;
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = {
          id,
          start: event.clientY,
          target: id,
          offset: 0,
          active: false,
        };
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        const current = gesture.current;
        if (!current || current.id !== id) return;
        const offset = event.clientY - current.start;
        if (!current.active && Math.abs(offset) < 5) return;
        let target = id,
          nearest = Infinity;
        for (const [key, node] of rows.current) {
          const rect = node.getBoundingClientRect();
          const center =
            rect.top + rect.height / 2 - (key === id ? current.offset : 0);
          const distance = Math.abs(event.clientY - center);
          if (distance < nearest) {
            nearest = distance;
            target = key;
          }
        }
        gesture.current = { ...current, offset, target, active: true };
        setDrag(gesture.current);
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        const current = gesture.current;
        if (current?.active) reorder(current.id, current.target);
        cancel();
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      },
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Escape") {
          cancel();
          return;
        }
        const index = ids.indexOf(id);
        const next =
          event.key === "ArrowUp"
            ? index - 1
            : event.key === "ArrowDown"
              ? index + 1
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? ids.length - 1
                  : null;
        if (next === null) return;
        event.preventDefault();
        if (ids[next]) reorder(id, ids[next]);
      },
    }),
  };
}
