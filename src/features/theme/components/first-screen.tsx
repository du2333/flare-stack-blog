import { createContext, useContext, type ReactNode } from "react";

/** Where the shell's first screen ends, in pixels from the top of the page. */
export type FirstScreenHeight = () => number;

const FirstScreenContext = createContext<FirstScreenHeight | null>(null);

/**
 * Every shell provides this around its tree. Back to top and the table of
 * contents appear once the page has scrolled past it, and the classic navbar
 * starts hiding there. Keep the function stable while the height rule stays
 * the same; readers re-subscribe when it changes.
 */
export function FirstScreenProvider({
  height,
  children,
}: {
  height: FirstScreenHeight;
  children: ReactNode;
}) {
  return (
    <FirstScreenContext.Provider value={height}>
      {children}
    </FirstScreenContext.Provider>
  );
}

export function useFirstScreenHeight(): FirstScreenHeight {
  const height = useContext(FirstScreenContext);
  if (!height) {
    throw new Error("useFirstScreenHeight must be used within a Theme Shell");
  }
  return height;
}
