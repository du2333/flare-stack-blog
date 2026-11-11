import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type {
  SidebarCard,
  ThemeShell,
  ThemeShellProps,
} from "@/features/theme/theme-shell";
import { FirstScreen } from "./first-screen";
import { Navbar } from "./navbar";

/** Sidebar cards come in after the content, 50ms apart. */
const CARD_DELAY_MS = 150;
const CARD_STEP_MS = 50;

/**
 * 「沉浸」: the banner fills the first screen with the navigation lying on it,
 * tall on the home page, where it introduces the author, and a low band
 * elsewhere. The content rises over its lower edge in one centred column, and
 * the sidebar cards follow the content at every width.
 */
function ImmersiveShell({
  pageKind,
  navOptions,
  sidebarCards,
  user,
  isSessionLoading,
  logout,
  children,
  footer,
  floatingActions,
}: ThemeShellProps) {
  // Whatever is neither the home page nor a focused page is an inner page.
  const isHomePage = pageKind === "home";
  const isFocusedPage = pageKind === "focused";
  const gaugeRef = useRef<HTMLDivElement>(null);
  // The banner is the first screen. The gauge already has the height the
  // banner is on its way to.
  const firstScreenHeight = useCallback(
    () => gaugeRef.current?.offsetHeight ?? 0,
    [],
  );
  // Going back or forward resizes the banner at once: the router restores the
  // scroll position then, and needs the page at its final height.
  const router = useRouter();
  const [traversing, setTraversing] = useState(false);
  useEffect(
    () =>
      router.history.subscribe(({ action }) =>
        setTraversing(action.type !== "PUSH" && action.type !== "REPLACE"),
      ),
    [router],
  );

  return (
    <FirstScreenProvider height={firstScreenHeight}>
      <div
        className="immersive-shell"
        data-theme-shell="immersive"
        data-home={isHomePage}
        data-instant={traversing}
      >
        <Navbar
          navOptions={navOptions}
          logout={logout}
          user={user}
          isLoading={isSessionLoading}
        />

        <FirstScreen gaugeRef={gaugeRef} home={isHomePage} />

        <div className="immersive-body" data-shell-region="body">
          <main className="immersive-main" data-shell-region="main">
            {children}
          </main>

          {isFocusedPage ? null : <Cards cards={sidebarCards} />}

          <div
            className="immersive-footer fuwari-onload-animation"
            style={{ animationDelay: "250ms" }}
            data-shell-region="footer"
          >
            {footer}
          </div>

          {floatingActions}
        </div>
      </div>
    </FirstScreenProvider>
  );
}

/** The cards in the given order, in rows after the content. */
function Cards({ cards }: { cards: Array<SidebarCard> }) {
  return (
    <aside className="immersive-cards" data-shell-region="sidebar">
      {cards.map((card, position) => (
        <div
          key={card.id}
          className="immersive-card fuwari-onload-animation"
          data-kind={card.kind}
          style={{
            animationDelay: `${CARD_DELAY_MS + position * CARD_STEP_MS}ms`,
          }}
        >
          {card.content}
        </div>
      ))}
    </aside>
  );
}

export const immersiveShell: ThemeShell = {
  id: "immersive",
  Shell: ImmersiveShell,
  identityInFirstScreen: ["home"],
  taglineOn: ["home"],
};
