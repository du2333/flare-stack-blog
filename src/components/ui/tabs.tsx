import { Link, type LinkProps } from "@tanstack/react-router";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { moveSelection } from "./roving-selection";
import { centeredScrollLeft, scrollEdges } from "./tab-scroll";
import "./tabs.css";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** A number shown after the label, such as how many items the tab holds. */
  count?: ReactNode;
  disabled?: boolean;
}

function TabLabel({ label, count }: { label: ReactNode; count?: ReactNode }) {
  return (
    <>
      {label}
      {count === undefined ? null : (
        <>
          {" "}
          <span className="fuwari-tab-count">{count}</span>
        </>
      )}
    </>
  );
}

/**
 * For a row that can overflow: marks which ends still have tabs to scroll to
 * (`data-scroll-start`, `data-scroll-end`, which the `scrollCue` styles fade
 * out) and keeps the selected tab in view.
 */
function useScrollCue<T extends HTMLElement>(enabled: boolean, value: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const row = ref.current;
    if (!enabled || !row) return;
    const update = () => {
      const edges = scrollEdges(row);
      row.toggleAttribute("data-scroll-start", edges.start);
      row.toggleAttribute("data-scroll-end", edges.end);
    };
    update();
    row.addEventListener("scroll", update, { passive: true });
    // The row resizes with the window; its tabs resize with their labels.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(row);
    for (const tab of row.children) observer?.observe(tab);
    return () => {
      row.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [enabled]);
  useEffect(() => {
    const row = ref.current;
    if (!enabled || !row) return;
    const selected = row.querySelector<HTMLElement>(
      '[aria-selected="true"], [aria-current="page"]',
    );
    if (selected) row.scrollLeft = centeredScrollLeft(row, selected);
  }, [enabled, value]);
  return ref;
}

/**
 * Underlined tabs that switch a panel or filter a list. Arrow keys, Home and
 * End move between them; `children` follow the tabs, such as a spinner.
 */
export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  scrollCue = false,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "role" | "onChange"> & {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  /** Fade the ends of a row that overflows, to show there is more to scroll to. */
  scrollCue?: boolean;
  "aria-label": string;
}) {
  const ref = useScrollCue<HTMLDivElement>(scrollCue, value);
  return (
    <div
      {...props}
      ref={ref}
      role="tablist"
      data-scroll-cue={scrollCue || undefined}
      className={cn("fuwari-tabs", className)}
      onKeyDown={(event) => moveSelection(event, items, value, onValueChange)}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            data-value={item.value}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            className="fuwari-tab"
            onClick={() => onValueChange(item.value)}
          >
            <TabLabel label={item.label} count={item.count} />
          </button>
        );
      })}
      {children}
    </div>
  );
}

/** The same tabs as links between routes; the current one is marked as the page. */
export function TabNav<T extends string>({
  items,
  value,
  scrollCue = false,
  className,
  ...props
}: Omit<ComponentProps<"nav">, "children"> & {
  items: ReadonlyArray<Omit<TabItem<T>, "disabled"> & { to: LinkProps["to"] }>;
  value: T;
  /** Fade the ends of a row that overflows, to show there is more to scroll to. */
  scrollCue?: boolean;
  "aria-label": string;
}) {
  const ref = useScrollCue<HTMLElement>(scrollCue, value);
  return (
    <nav
      {...props}
      ref={ref}
      data-scroll-cue={scrollCue || undefined}
      className={cn("fuwari-tabs", className)}
    >
      {items.map((item) => (
        <Link
          key={item.value}
          to={item.to}
          aria-current={item.value === value ? "page" : undefined}
          className="fuwari-tab"
        >
          <TabLabel label={item.label} count={item.count} />
        </Link>
      ))}
    </nav>
  );
}
