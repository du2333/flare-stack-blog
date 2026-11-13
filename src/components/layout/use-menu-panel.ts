import { useEffect, useRef, useState, type FocusEvent } from "react";
import { MOTION, useMotionPresence } from "@/hooks/use-motion";

/**
 * The panel a navbar opens around the public menu (mobile-menu.tsx), from the
 * compact menu button or from the account button. It closes on a navigation,
 * a press outside, Escape, a resize, and when focus leaves it; opening moves
 * focus to its first item and Escape gives it back to the button.
 */
export function useMenuPanel(pathname: string) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const present = useMotionPresence(open, MOTION.popover);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    panelRef.current
      ?.querySelector<HTMLElement>("a, button")
      ?.focus({ preventScroll: true });
    const pointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      )
        setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    const resize = () => setOpen(false);
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  return {
    open,
    /** Whether the open panel is the compact menu, not the account menu. */
    mobile,
    /** Mounted: open, or still playing its exit. */
    present,
    /** Opens the panel from `button`, or closes it. */
    toggle: (button: HTMLButtonElement, compact: boolean) => {
      triggerRef.current = button;
      setMobile(compact);
      setOpen((value) => !value);
    },
    close: () => setOpen(false),
    /** For the panel element; add its id and classes. */
    panelProps: {
      ref: panelRef,
      "data-state": open ? "open" : "closing",
      inert: !open,
      "aria-hidden": !open,
      onBlur: (event: FocusEvent<HTMLDivElement>) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget as Node) &&
          event.relatedTarget !== triggerRef.current
        )
          setOpen(false);
      },
    },
  };
}
