import { Link, type LinkProps } from "@tanstack/react-router";
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { moveSelection } from "./roving-selection";
import { centeredScrollLeft, scrollEdges } from "./tab-scroll";
import "./tabs.css";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** A number shown after the label, such as how many items the tab holds. */
  count?: ReactNode;
  /**
   * Flags the tab with a dot that takes no room, so no tab moves; the text
   * names the flag for assistive tech, such as "Unsaved changes".
   */
  mark?: string;
  disabled?: boolean;
}

function TabLabel({
  label,
  count,
  mark,
}: {
  label: ReactNode;
  count?: ReactNode;
  mark?: string;
}) {
  return (
    <>
      {label}
      {mark === undefined ? null : (
        <span role="img" aria-label={mark} className="fuwari-tab-mark" />
      )}
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

export type TabsVariantName = "underline" | "segmented";

const VariantContext = createContext<TabsVariantName>("underline");

/**
 * The form the tabs inside take unless they name one: the Admin page frame
 * gives its head the segmented form.
 */
export function TabsVariant({
  value,
  children,
}: {
  value: TabsVariantName;
  children: ReactNode;
}) {
  return <VariantContext value={value}>{children}</VariantContext>;
}

/** A pill's key: the tabs, and the counts that change their widths. */
function pillKey(items: ReadonlyArray<{ value: string; count?: ReactNode }>) {
  return items
    .map(
      ({ value, count }) =>
        `${value}:${typeof count === "number" || typeof count === "string" ? count : ""}`,
    )
    .join(",");
}

/**
 * For the segmented form: places the pill under the selected tab and, once
 * it has been placed, lets it slide (`data-pill="moving"`) to the next one.
 * It follows the tabs when they resize, such as when a count arrives.
 */
function useSlidingPill(
  enabled: boolean,
  row: RefObject<HTMLElement | null>,
  value: string,
  labels: string,
) {
  const pill = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const track = row.current;
    const mark = pill.current;
    if (!enabled || !track || !mark) return;
    const place = () => {
      const chosen = track.querySelector<HTMLElement>(
        '[aria-selected="true"], [aria-current="page"]',
      );
      if (!chosen) return;
      mark.style.width = `${chosen.offsetWidth}px`;
      mark.style.transform = `translateX(${chosen.offsetLeft}px)`;
      if (!track.dataset.pill) {
        track.dataset.pill = "placed";
        requestAnimationFrame(() => {
          track.dataset.pill = "moving";
        });
      }
    };
    place();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(place);
    observer.observe(track);
    return () => observer.disconnect();
  }, [enabled, row, value, labels]);
  return pill;
}

/**
 * Tabs that switch a panel or filter a list: underlined, or `segmented`, a
 * grey track (the Admin's) whose white pill slides to the chosen tab. Arrow
 * keys, Home and End move between them; `children` follow the tabs, such as
 * a spinner.
 */
export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  scrollCue = false,
  variant: own,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "role" | "onChange"> & {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  /** Fade the ends of a row that overflows, to show there is more to scroll to. */
  scrollCue?: boolean;
  /** The form; by default the one `TabsVariant` gives, else underlined. */
  variant?: TabsVariantName;
  "aria-label": string;
}) {
  const inherited = use(VariantContext);
  const segmented = (own ?? inherited) === "segmented";
  const ref = useScrollCue<HTMLDivElement>(scrollCue, value);
  const pill = useSlidingPill(segmented, ref, value, pillKey(items));
  return (
    <div
      {...props}
      ref={ref}
      role="tablist"
      data-scroll-cue={scrollCue || undefined}
      data-variant={segmented ? "segmented" : undefined}
      className={cn("fuwari-tabs", className)}
      onKeyDown={(event) => moveSelection(event, items, value, onValueChange)}
    >
      {segmented ? (
        <span ref={pill} className="fuwari-tabs-pill" aria-hidden />
      ) : null}
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
            <TabLabel label={item.label} count={item.count} mark={item.mark} />
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
  variant: own,
  className,
  ...props
}: Omit<ComponentProps<"nav">, "children"> & {
  items: ReadonlyArray<Omit<TabItem<T>, "disabled"> & { to: LinkProps["to"] }>;
  value: T;
  /** Fade the ends of a row that overflows, to show there is more to scroll to. */
  scrollCue?: boolean;
  variant?: TabsVariantName;
  "aria-label": string;
}) {
  const inherited = use(VariantContext);
  const segmented = (own ?? inherited) === "segmented";
  const ref = useScrollCue<HTMLElement>(scrollCue, value);
  const pill = useSlidingPill(segmented, ref, value, pillKey(items));
  return (
    <nav
      {...props}
      ref={ref}
      data-scroll-cue={scrollCue || undefined}
      data-variant={segmented ? "segmented" : undefined}
      className={cn("fuwari-tabs", className)}
    >
      {segmented ? (
        <span ref={pill} className="fuwari-tabs-pill" aria-hidden />
      ) : null}
      {items.map((item) => (
        <Link
          key={item.value}
          to={item.to}
          aria-current={item.value === value ? "page" : undefined}
          className="fuwari-tab"
        >
          <TabLabel label={item.label} count={item.count} mark={item.mark} />
        </Link>
      ))}
    </nav>
  );
}
