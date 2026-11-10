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

/** Shared by every button in the floating column. */
export const FLOATING_ACTION_BUTTON_CLASS =
  "flex items-center justify-center w-12 h-12 lg:w-15 lg:h-15 rounded-2xl fuwari-card-base fuwari-card-floating shadow-md text-(--theme-accent) hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) active:scale-90 transition-all";

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
