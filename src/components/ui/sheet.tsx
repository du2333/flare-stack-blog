import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { MOTION, useMotionPresence } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";
import "./sheet.css";

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

// A control inside whose popup is open handles Escape itself.
const OPEN_POPUP =
  '[aria-expanded="true"]:is([aria-haspopup], [role="combobox"])';

export interface SheetProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  open: boolean;
  /** Escape inside the sheet, or a click on its backdrop. */
  onClose: () => void;
  /**
   * A modal sheet keeps focus inside, locks the page's scroll and shows a
   * backdrop. A non-modal one leaves the page usable, for content whose
   * pickers portal outside the sheet.
   */
  modal?: boolean;
  /** A dimmed backdrop that closes the sheet; modal sheets always have one. */
  backdrop?: boolean;
  backdropClassName?: string;
  /** `bottom` rises from the screen's lower edge across its full width. */
  side?: "left" | "right" | "bottom";
  /** Width on wider screens: md 23rem, lg 25rem; full width on phones. */
  size?: "md" | "lg";
  as?: "div" | "aside";
  /**
   * Stays rendered while closed, as `data-state="closed"`, for a panel the
   * page lays out in place on wider screens.
   */
  keepMounted?: boolean;
  /** Focused on open; the first focusable element by default. */
  initialFocus?: () => HTMLElement | null;
  children: ReactNode;
}

/**
 * A panel that slides in from a side of the screen. Opening moves focus in,
 * closing returns it to where it was, and Escape closes it unless a popup
 * inside is open. Position it with the page's CSS when it is not fixed to
 * the viewport's side.
 */
export function Sheet({
  open,
  onClose,
  modal = true,
  backdrop = modal,
  backdropClassName,
  side = "right",
  size = "md",
  as: Panel = "div",
  keepMounted = false,
  initialFocus,
  className,
  onKeyDown,
  children,
  ...rest
}: SheetProps) {
  const present = useMotionPresence(open, MOTION.panel);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusTarget = useRef(initialFocus);
  focusTarget.current = initialFocus;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previous = document.activeElement as HTMLElement | null;
    (
      focusTarget.current?.() ??
      (panel && focusables(panel)[0]) ??
      panel
    )?.focus();
    return () => {
      // Leave focus alone if it has already moved somewhere else.
      const current = document.activeElement;
      const lost =
        !current || current === document.body || panel?.contains(current);
      if (lost && previous?.isConnected) previous.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !modal) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
    };
  }, [open, modal]);

  if (!present && !keepMounted) return null;
  const state = open ? "open" : present ? "closing" : "closed";

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    const panel = event.currentTarget;
    // Popups portalled from inside reach here through React, not the DOM.
    if (!open || event.defaultPrevented) return;
    if (!panel.contains(event.target as Node)) return;
    if (event.key === "Escape" && !panel.querySelector(OPEN_POPUP)) {
      event.stopPropagation();
      onClose();
    }
    if (event.key === "Tab" && modal) {
      const items = focusables(panel);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <>
      {backdrop && present ? (
        <div
          aria-hidden="true"
          data-state={open ? "open" : "closing"}
          className={cn("fuwari-sheet-backdrop", backdropClassName)}
          onClick={open ? onClose : undefined}
        />
      ) : null}
      <Panel
        {...rest}
        ref={panelRef}
        role={modal && open ? "dialog" : rest.role}
        aria-modal={modal && open ? true : undefined}
        tabIndex={-1}
        data-side={side}
        data-size={size}
        data-state={state}
        inert={state === "closing"}
        onKeyDown={handleKeyDown}
        className={cn("fuwari-sheet", className)}
      >
        {children}
      </Panel>
    </>
  );
}

function focusables(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getClientRects().length > 0,
  );
}
