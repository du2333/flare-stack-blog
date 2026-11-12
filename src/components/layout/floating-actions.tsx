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

const FloatingActionsContext = createContext<SlotState | null>(null);

/**
 * Shared by every button in the floating column: 3rem a side, and from lg
 * 3.75rem unless the Theme Shell says otherwise
 * (`--shell-floating-actions-size`, theme-shell.ts).
 */
export const FLOATING_ACTION_BUTTON_CLASS =
  "flex items-center justify-center size-12 lg:size-(--shell-floating-actions-size,3.75rem) rounded-(--theme-floating-radius,var(--radius-2xl)) fuwari-card-base fuwari-card-floating shadow-md text-(--theme-accent) hover:bg-(--theme-plain-bg-hover) active:bg-(--theme-plain-bg-active) active:scale-90 transition-all";

/** The icon of such a button: 1.5rem, and from lg 7/15 of its button. */
export const FLOATING_ACTION_ICON_CLASS =
  "size-6 lg:size-[calc(var(--shell-floating-actions-size,3.75rem)*7/15)]";

/**
 * Lets a page add its own buttons to the floating column, stacked above
 * Back to top so they share its size and position.
 */
export function FloatingActionsProvider({ children }: { children: ReactNode }) {
  const state = useState<HTMLElement | null>(null);
  return (
    <FloatingActionsContext.Provider value={state}>
      {children}
    </FloatingActionsContext.Provider>
  );
}

/** The element to portal page actions into, once the column has mounted. */
export function useFloatingActionsSlot() {
  return useContext(FloatingActionsContext)?.[0] ?? null;
}

/** A ref callback for the column's slot element. */
export function useFloatingActionsSlotRef() {
  return useContext(FloatingActionsContext)?.[1];
}
