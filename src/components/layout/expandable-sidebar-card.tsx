import { Ellipsis } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * Which entries the collapsed card cuts off, from where they really are:
 * how many fit depends on the form the card has taken and on the width it
 * was given, which only the browser knows. An entry counts as cut off when it
 * starts below what the card shows, which is the entries' own box in the
 * narrow form and the window in the wide one.
 *
 * Entries that are cut off are made inert, so the keyboard does not walk
 * into what cannot be seen. Returns whether any is, and null until measured.
 */
function useCutOff(
  windowRef: RefObject<HTMLElement | null>,
  entriesRef: RefObject<HTMLElement | null>,
  collapsed: boolean,
  /** What the card was given to show; measured again whenever it changes. */
  children: ReactNode,
) {
  const [cutOff, setCutOff] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    const pane = windowRef.current;
    const box = entriesRef.current;
    if (!pane || !box) return;
    const entries = Array.from(box.children);
    if (!collapsed) {
      for (const entry of entries) entry.removeAttribute("inert");
      setCutOff(false);
      return;
    }
    const measure = () => {
      // Not laid out (a hidden ancestor): nothing to tell yet.
      if (box.getClientRects().length === 0) return;
      const shown = Math.min(
        box.getBoundingClientRect().bottom,
        pane.getBoundingClientRect().bottom,
      );
      let any = false;
      for (const entry of entries) {
        const hidden = entry.getBoundingClientRect().top >= shown - 1;
        entry.toggleAttribute("inert", hidden);
        any ||= hidden;
      }
      setCutOff(any);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    // The boxes follow the card's width. The entries are watched too: a web
    // font arriving, or an entry easing from one form into the other, moves
    // them without resizing a box of fixed height.
    const observer = new ResizeObserver(measure);
    for (const element of [pane, box, ...entries]) observer.observe(element);
    return () => observer.disconnect();
  }, [windowRef, entriesRef, collapsed, children]);
  return cutOff;
}

/**
 * A sidebar card whose entries can be cut short behind 「更多」, in two forms
 * on one markup.
 *
 * Narrow (today's sidebar column): the title over the entries, and a list
 * that is `long` cut to 7.5rem with 「更多」 as a row under it.
 *
 * Wide (in a `card` container from 20rem): the entries are pills, cut to two
 * rows under the title and, from 34rem, to one row after it, whatever their
 * number; 「更多」 stands at the end of the title's line and shows only while
 * something is really cut off. `.fuwari-widget-window` in styles.css cuts
 * and decides that without a script; the measurement here agrees with it,
 * takes over once it has run, and keeps the keyboard out of what is cut off.
 * The entries style themselves for both forms (`@xs/card:`).
 */
export function ExpandableSidebarCard({
  title,
  long,
  expanded,
  onExpand,
  contentClassName,
  children,
}: {
  title: string;
  /** Enough entries for the narrow form to cut them short. */
  long: boolean;
  /** The reader asked for all of them. */
  expanded: boolean;
  onExpand: () => void;
  contentClassName?: string;
  /** The entries, each one element. */
  children: ReactNode;
}) {
  const { headingAccent } = useThemeRecipe();
  const windowRef = useRef<HTMLDivElement>(null);
  const entriesRef = useRef<HTMLDivElement>(null);
  const cutOff = useCutOff(windowRef, entriesRef, !expanded, children);

  // 「更多」 goes away once it is used; whoever used it with the keyboard goes
  // on from the first entry it revealed.
  const resumeAt = useRef<number | null>(null);
  const expand = (button: HTMLButtonElement) => {
    const entries = Array.from(entriesRef.current?.children ?? []);
    const firstRevealed = entries.findIndex((entry) =>
      entry.hasAttribute("inert"),
    );
    resumeAt.current =
      document.activeElement === button && firstRevealed >= 0
        ? firstRevealed
        : null;
    onExpand();
  };
  useLayoutEffect(() => {
    if (!expanded || resumeAt.current === null) return;
    const entry = entriesRef.current?.children[resumeAt.current];
    resumeAt.current = null;
    if (entry instanceof HTMLElement) entry.focus();
  }, [expanded]);

  return (
    <div
      className="fuwari-card-base fuwari-card-widget pb-4 @xs/card:px-(--theme-widget-pad-x,1.25rem) @xs/card:py-3.5"
      data-cut-off={cutOff ?? undefined}
    >
      <div
        ref={windowRef}
        className={expanded ? undefined : "fuwari-widget-window"}
      >
        <div
          className={cn(
            "@xs/card:grid @xs/card:grid-cols-[minmax(0,1fr)_auto] @xs/card:items-start @xs/card:gap-x-4 @xs/card:gap-y-2",
            expanded
              ? "@[34rem]/card:grid-cols-[auto_minmax(0,1fr)]"
              : "@[34rem]/card:grid-cols-[auto_minmax(0,1fr)_auto]",
          )}
        >
          <div className="fuwari-widget-title font-bold relative ml-(--theme-widget-pad-x,1.5rem) mt-4 mb-2 @xs/card:col-start-1 @xs/card:row-start-1 @xs/card:m-0 @xs/card:leading-8">
            {headingAccent === "on" ? (
              <span
                className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md @xs/card:hidden"
                style={{ backgroundColor: "var(--theme-accent)" }}
              />
            ) : null}
            {title}
          </div>
          <div
            ref={entriesRef}
            className={cn(
              "px-(--theme-widget-pad-x,1rem)",
              contentClassName,
              "overflow-hidden",
              long && !expanded && "h-30",
              "@xs/card:col-span-2 @xs/card:col-start-1 @xs/card:row-start-2 @xs/card:flex @xs/card:h-auto @xs/card:flex-wrap @xs/card:gap-2 @xs/card:overflow-visible @xs/card:px-0",
              "@[34rem]/card:col-span-1 @[34rem]/card:col-start-2 @[34rem]/card:row-start-1",
            )}
          >
            {children}
          </div>
          {expanded ? null : (
            <div
              className={cn(
                "fuwari-widget-more px-(--theme-widget-pad-x,1rem) -mb-2",
                // The narrow form offers it by the number of entries alone.
                !long && "hidden @xs/card:block",
                "@xs/card:col-start-2 @xs/card:row-span-2 @xs/card:row-start-1 @xs/card:m-0 @xs/card:p-0",
                "@[34rem]/card:col-start-3 @[34rem]/card:row-span-1 @[34rem]/card:row-start-1",
              )}
            >
              <button
                type="button"
                onClick={(event) => expand(event.currentTarget)}
                className="rounded-lg w-full h-9 flex items-center justify-center text-(--fuwari-fg-75) hover:text-(--theme-accent) hover:bg-(--theme-plain-bg-hover) active:bg-(--theme-plain-bg-active) transition @xs/card:-mx-2 @xs/card:h-8 @xs/card:w-auto @xs/card:px-2 @xs/card:text-sm"
              >
                <span className="text-(--theme-widget-more-color,var(--theme-accent)) flex items-center justify-center gap-2 -translate-x-2 @xs/card:translate-x-0">
                  <Ellipsis size={28} className="@xs/card:hidden" />
                  {m.widget_more()}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
