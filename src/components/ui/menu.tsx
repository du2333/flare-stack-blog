import type { Placement } from "@floating-ui/dom";
import {
  createContext,
  use,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { FloatingPopover } from "./floating-popover";

const ITEMS = '[role^="menuitem"]:not(:disabled)';

/** A tall menu scrolls at 16rem, or sooner where the viewport leaves less. */
const MENU_MAX_HEIGHT = 256;

const ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors disabled:pointer-events-none disabled:opacity-50 pointer-coarse:min-h-11";

/** Runs a picked item's action once the menu has closed onto its trigger. */
const SelectContext = createContext<
  (run: (trigger: HTMLButtonElement) => void) => void
>(() => {});

function menuItems(panel: HTMLElement | null) {
  return Array.from(panel?.querySelectorAll<HTMLElement>(ITEMS) ?? []);
}

function nextIndex(
  event: KeyboardEvent<HTMLElement>,
  items: Array<HTMLElement>,
  current: number,
) {
  switch (event.key) {
    case "ArrowDown":
      return (current + 1) % items.length;
    case "ArrowUp":
      return (current - 1 + items.length) % items.length;
    case "Home":
      return 0;
    case "End":
      return items.length - 1;
  }
  if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey)
    return -1;
  // Typeahead: the next item, after the focused one, starting with the key.
  const key = event.key.toLowerCase();
  const order = [...items.slice(current + 1), ...items.slice(0, current + 1)];
  const match = order.find((item) =>
    item.textContent?.trim().toLowerCase().startsWith(key),
  );
  return match ? items.indexOf(match) : -1;
}

interface MenuProps {
  /** Names the trigger and the menu. */
  label: string;
  /** The trigger's content. */
  trigger: ReactNode;
  triggerClassName: string;
  /** A tooltip for a trigger that shows no text. */
  triggerTitle?: string;
  disabled?: boolean;
  placement?: Placement;
  /** As wide as the trigger (11rem at least), and kept inside the viewport, instead of 11 to 18rem. */
  matchTriggerWidth?: boolean;
  children: ReactNode;
}

/**
 * A trigger and the menu it opens beside itself. ArrowDown or ArrowUp on the
 * trigger opens it on the first or last item (a click opens it on the checked
 * radio item, else the first); arrows, Home, End and typeahead move focus
 * between items; Escape closes it back onto the trigger, and Tab closes it
 * and moves on from the trigger.
 */
export function Menu({
  label,
  trigger,
  triggerClassName,
  triggerTitle,
  disabled = false,
  placement = "bottom-end",
  matchTriggerWidth = false,
  children,
}: MenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  if (open && disabled) setOpen(false);
  const isOpen = open && !disabled;
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const edge = useRef<"first" | "last">("first");

  const close = () => {
    setOpen(false);
    triggerEl?.focus({ preventScroll: true });
  };

  // Close first, so a dialog the action opens returns focus to the trigger.
  const select = (run: (trigger: HTMLButtonElement) => void) => {
    close();
    if (triggerEl) run(triggerEl);
  };

  const initialFocus = () => {
    const items = menuItems(document.getElementById(id));
    if (edge.current === "last") return items.at(-1) ?? null;
    return (
      items.find(
        (item) =>
          item.getAttribute("role") === "menuitemradio" &&
          item.getAttribute("aria-checked") === "true",
      ) ??
      items[0] ??
      null
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "Tab") {
      // The browser then moves on from the trigger's place in the page.
      close();
      return;
    }
    const items = menuItems(event.currentTarget);
    const next = nextIndex(
      event,
      items,
      items.indexOf(document.activeElement as HTMLElement),
    );
    if (next < 0) return;
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <>
      <button
        ref={setTriggerEl}
        type="button"
        className={triggerClassName}
        aria-label={label}
        title={triggerTitle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        disabled={disabled}
        onClick={() => {
          edge.current = "first";
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          edge.current = event.key === "ArrowUp" ? "last" : "first";
          setOpen(true);
        }}
      >
        {trigger}
      </button>
      <FloatingPopover
        open={isOpen}
        anchor={triggerEl}
        placement={placement}
        onDismiss={(reason) => (reason === "escape" ? close() : setOpen(false))}
        initialFocus={initialFocus}
        id={id}
        role="menu"
        aria-label={label}
        matchTriggerWidth={matchTriggerWidth}
        maxHeight={matchTriggerWidth ? MENU_MAX_HEIGHT : undefined}
        className={cn(
          "max-h-[min(16rem,calc(100dvh-16px))] min-w-44 overflow-y-auto overscroll-contain p-1 custom-scrollbar",
          !matchTriggerWidth && "max-w-72",
        )}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next && !event.currentTarget.contains(next) && next !== triggerEl)
            setOpen(false);
        }}
      >
        <SelectContext value={select}>{children}</SelectContext>
      </FloatingPopover>
    </>
  );
}

interface MenuItemProps {
  onSelect: (trigger: HTMLButtonElement) => void;
  role?: "menuitem" | "menuitemradio" | "menuitemcheckbox";
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

/** One row of a `Menu`; picking it closes the menu, then runs `onSelect`. */
export function MenuItem({
  onSelect,
  role = "menuitem",
  checked,
  danger = false,
  disabled,
  children,
}: MenuItemProps) {
  const select = use(SelectContext);
  const current = role === "menuitemradio" && checked;
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "menuitem" ? undefined : checked}
      tabIndex={-1}
      disabled={disabled}
      onClick={() => select(onSelect)}
      className={cn(
        ITEM_CLASS,
        current
          ? "bg-(--fuwari-btn-regular-bg) text-(--fuwari-primary)"
          : danger
            ? "text-(--fuwari-danger-fg) hover:bg-(--fuwari-danger-bg) focus-visible:bg-(--fuwari-danger-bg)"
            : "fuwari-text-75 hover:bg-(--fuwari-btn-regular-bg)/70 hover:text-(--fuwari-fg) focus-visible:bg-(--fuwari-btn-regular-bg)/70 focus-visible:text-(--fuwari-fg)",
      )}
    >
      {children}
    </button>
  );
}

/** A rule between groups of menu items. */
export function MenuSeparator() {
  return (
    <div
      role="separator"
      className="mx-2 my-1 h-px bg-(--fuwari-input-border)"
    />
  );
}
