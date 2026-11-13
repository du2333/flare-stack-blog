import type { Placement } from "@floating-ui/dom";
import {
  createContext,
  use,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { FloatingPopover } from "./floating-popover";

const ITEMS = '[role^="menuitem"]:not(:disabled)';

/** A tall menu scrolls at 16rem, or sooner where the viewport leaves less. */
const MENU_MAX_HEIGHT = 256;

/**
 * With `openOnHover`: how long the pointer rests on the trigger before the
 * menu opens, so a pass across it does not, and how long the menu waits once
 * the pointer has left the trigger and the menu, so it can cross the gap.
 */
export const MENU_HOVER_OPEN_DELAY = 80;
export const MENU_HOVER_CLOSE_DELAY = 300;

const ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors disabled:pointer-events-none disabled:opacity-50 pointer-coarse:min-h-11";
const ITEM_CURRENT_CLASS = "bg-(--theme-tonal-bg) text-(--theme-accent)";
const ITEM_PLAIN_CLASS =
  "fuwari-text-75 hover:bg-(--theme-tonal-bg)/70 hover:text-(--fuwari-fg) focus-visible:bg-(--theme-tonal-bg)/70 focus-visible:text-(--fuwari-fg)";

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
  /** `data-*` attributes for the trigger, for a look that follows a state. */
  triggerData?: Record<`data-${string}`, string | undefined>;
  /** The trigger stands for the current page (`aria-current="true"`). */
  triggerCurrent?: boolean;
  disabled?: boolean;
  placement?: Placement;
  /** As wide as the trigger (11rem at least), and kept inside the viewport, instead of 11 to 18rem. */
  matchTriggerWidth?: boolean;
  /**
   * A mouse resting on the trigger opens the menu too, without moving focus
   * into it, and it closes shortly after the mouse leaves the trigger and
   * the menu. A click, Enter or an arrow key while it is open so keeps it
   * open until it is dismissed. Touch and pen only click.
   */
  openOnHover?: boolean;
  /**
   * Closes the open menu whenever this value changes, for an owner that
   * moves the trigger away from where the menu stands. Focus that was in the
   * menu goes back to the trigger; focus anywhere else stays where it is.
   */
  dismissOn?: unknown;
  children: ReactNode;
}

/**
 * A trigger and the menu it opens beside itself. ArrowDown or ArrowUp on the
 * trigger opens it on the first or last item (a click opens it on the checked
 * radio item or the current link, else the first); arrows, Home, End and
 * typeahead move focus between items; Escape closes it back onto the
 * trigger, and Tab closes it and moves on from the trigger. Focus leaving
 * for anything but the trigger and the menu closes it, also while it is
 * open without focus inside (`openOnHover`).
 */
export function Menu({
  label,
  trigger,
  triggerClassName,
  triggerTitle,
  triggerData,
  triggerCurrent = false,
  disabled = false,
  placement = "bottom-end",
  matchTriggerWidth = false,
  openOnHover = false,
  dismissOn,
  children,
}: MenuProps) {
  const id = useId();
  const [open, setOpenState] = useState(false);
  if (open && disabled) setOpenState(false);
  const isOpen = open && !disabled;
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const edge = useRef<"first" | "last">("first");
  // Opened by the mouse resting on the trigger: no focus moves in, and the
  // mouse leaving closes it.
  const byHover = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setOpen = (next: boolean | ((value: boolean) => boolean)) => {
    clearTimeout(hoverTimer.current);
    setOpenState(next);
  };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const close = () => {
    setOpen(false);
    triggerEl?.focus({ preventScroll: true });
  };

  // Before the change is painted, so the menu is never seen where the
  // trigger no longer is.
  const dismissedOn = useRef(dismissOn);
  useLayoutEffect(() => {
    if (Object.is(dismissedOn.current, dismissOn)) return;
    dismissedOn.current = dismissOn;
    if (!open) return;
    if (document.getElementById(id)?.contains(document.activeElement)) close();
    else setOpen(false);
    // Only a change of the signal closes the menu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissOn]);

  // Rest on the trigger to open; leave the trigger and the menu to close.
  const hover = (enter: boolean) => (event: PointerEvent<HTMLElement>) => {
    if (!openOnHover || disabled || event.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    // Coming back keeps an open menu; leaving first cancels the opening.
    if (enter === open) return;
    // A menu opened by a click or a key stays until it is dismissed.
    if (!enter && !byHover.current) return;
    hoverTimer.current = setTimeout(
      () => {
        if (enter) byHover.current = true;
        setOpenState(enter);
      },
      enter ? MENU_HOVER_OPEN_DELAY : MENU_HOVER_CLOSE_DELAY,
    );
  };

  // Close first, so a dialog the action opens returns focus to the trigger.
  const select = (run: (trigger: HTMLButtonElement) => void) => {
    close();
    if (triggerEl) run(triggerEl);
  };

  const focusTarget = () => {
    const items = menuItems(document.getElementById(id));
    if (edge.current === "last") return items.at(-1) ?? null;
    return (
      items.find(
        (item) =>
          (item.getAttribute("role") === "menuitemradio" &&
            item.getAttribute("aria-checked") === "true") ||
          item.getAttribute("aria-current") === "page",
      ) ??
      items[0] ??
      null
    );
  };
  const initialFocus = () => (byHover.current ? null : focusTarget());

  // A menu the mouse opened becomes one the visitor asked for: it stays open
  // and takes focus as a click would have given it.
  const keepHoverOpen = () => {
    if (!byHover.current) return false;
    byHover.current = false;
    setOpen(true);
    focusTarget()?.focus();
    return true;
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
        {...triggerData}
        ref={setTriggerEl}
        type="button"
        className={triggerClassName}
        aria-label={label}
        title={triggerTitle}
        aria-current={triggerCurrent ? "true" : undefined}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        disabled={disabled}
        onClick={() => {
          edge.current = "first";
          if (open && keepHoverOpen()) return;
          byHover.current = false;
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          edge.current = event.key === "ArrowUp" ? "last" : "first";
          if (open && keepHoverOpen()) return;
          byHover.current = false;
          setOpen(true);
        }}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        // Focus leaves the trigger of a menu that holds none, as after a
        // hover: Tab moves on from the trigger and takes the menu with it.
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (open && next && !document.getElementById(id)?.contains(next))
            setOpen(false);
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
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
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
          ? ITEM_CURRENT_CLASS
          : danger
            ? "text-(--fuwari-danger-fg) hover:bg-(--fuwari-danger-bg) focus-visible:bg-(--fuwari-danger-bg)"
            : ITEM_PLAIN_CLASS,
      )}
    >
      {children}
    </button>
  );
}

/** What a `MenuLinkItem` hands the link it renders. */
export interface MenuLinkItemProps {
  role: "menuitem";
  tabIndex: -1;
  className: string;
  "aria-current": "page" | undefined;
  onClick: () => void;
}

/**
 * One row of a `Menu` that is a link, so it can be opened in a new tab like
 * any other. `render` draws the link (an `<a>`, or the router's) with the
 * props it is given; following it closes the menu. `current` marks the row
 * whose page is open, which is also where a click opens the menu.
 */
export function MenuLinkItem({
  current = false,
  render,
}: {
  current?: boolean;
  render: (props: MenuLinkItemProps) => ReactNode;
}) {
  const select = use(SelectContext);
  return render({
    role: "menuitem",
    tabIndex: -1,
    className: cn(ITEM_CLASS, current ? ITEM_CURRENT_CLASS : ITEM_PLAIN_CLASS),
    "aria-current": current ? "page" : undefined,
    onClick: () => select(() => {}),
  });
}

/** The name of the group of items that follows; not an item itself. */
export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div
      role="presentation"
      className="px-3 pt-1.5 pb-1 text-xs font-medium fuwari-text-50"
    >
      {children}
    </div>
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
