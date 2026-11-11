import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type SlotState = [
  HTMLElement | null,
  Dispatch<SetStateAction<HTMLElement | null>>,
];

const TocSlotContext = createContext<SlotState | null>(null);

/**
 * The host provides this around the shell (public-shell.tsx), as it does the
 * floating actions, so the table of contents of a Post finds the slot its
 * shell gives it.
 */
export function TocSlotProvider({ children }: { children: ReactNode }) {
  const state = useState<HTMLElement | null>(null);
  return (
    <TocSlotContext.Provider value={state}>{children}</TocSlotContext.Provider>
  );
}

/**
 * A place in the shell's own tree, such as a box in a rail, for the side
 * table of contents of a Post. While a slot is mounted the side list renders
 * into it instead of standing fixed beside the article: it fills the slot's
 * box, scrolls within it when it is the longer, and shows from the top of
 * the page; `--shell-toc-top`, `--shell-toc-left` and `--shell-toc-width`
 * are not read. `--shell-toc-side` and `--shell-toc-compact` still say at
 * which widths the list shows and at which the button opens it instead, so
 * where the stylesheet hides the slot it sets those two the other way round.
 *
 * A shell renders at most one, with nothing in it. Give it a definite
 * height (a flex item with `min-height: 0` in a column as tall as the
 * window, say) for a long list to scroll in it; at its own height it grows
 * with the list. A Post without headings leaves it empty: the table of
 * contents marks the page with `[data-table-of-contents]` from the first
 * paint while it has one, so the stylesheet can show something else in the
 * slot's place with `:has()`. Keep the slot mounted while a Post's page
 * fades out (render it on every page, or switch it with `useReadingColumn`
 * rather than with `pageKind`); a list whose slot goes would stand at the
 * fixed place for that moment.
 */
export function TocSlot({ className }: { className?: string }) {
  const register = useContext(TocSlotContext)?.[1];
  return <div ref={register} className={className} data-toc-slot="" />;
}

/** The shell's slot for the side table of contents, once it has mounted. */
export function useTocSlot(): HTMLElement | null {
  return useContext(TocSlotContext)?.[0] ?? null;
}
