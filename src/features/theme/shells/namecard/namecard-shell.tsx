import { useCallback, useRef } from "react";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type {
  SidebarCard,
  ThemeShell,
  ThemeShellProps,
} from "@/features/theme/theme-shell";
import { FirstScreen } from "./first-screen";
import { DEFAULT_FRAME, isFrame } from "./frame";
import { Navbar } from "./navbar";

/** Sidebar cards come in after the navbar, 50ms apart. */
const CARD_DELAY_MS = 100;
const CARD_STEP_MS = 50;

/**
 * 「名片」: a bare navbar, on the home page a first screen that introduces the
 * author beside the banner in a frame, and the sidebar cards left of content
 * that sits flat on the page.
 */
function NamecardShell({
  pageKind,
  options,
  navOptions,
  sidebarCards,
  user,
  isSessionLoading,
  logout,
  children,
  footer,
  floatingActions,
}: ThemeShellProps) {
  const isHomePage = pageKind === "home";
  const isFocusedPage = pageKind === "focused";
  const frame = isFrame(options.frame) ? options.frame : DEFAULT_FRAME;
  const firstScreenRef = useRef<HTMLElement>(null);
  // The navbar and, on the home page, what unfolds under it.
  const firstScreenHeight = useCallback(() => {
    const firstScreen = firstScreenRef.current;
    return firstScreen ? firstScreen.offsetTop + firstScreen.offsetHeight : 0;
  }, []);

  return (
    <FirstScreenProvider height={firstScreenHeight}>
      <div
        className="namecard-shell"
        data-theme-shell="namecard"
        data-frame={frame}
      >
        <Navbar
          navOptions={navOptions}
          logout={logout}
          user={user}
          isLoading={isSessionLoading}
        />

        <FirstScreen ref={firstScreenRef} open={isHomePage} />

        <div
          className="namecard-body"
          data-focused={isFocusedPage}
          data-shell-region="body"
        >
          {isFocusedPage ? null : <Sidebar cards={sidebarCards} />}

          <main className="namecard-main" data-shell-region="main">
            {children}
          </main>

          <div
            className="namecard-footer fuwari-onload-animation"
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

/** The cards in the given order; index cards stay in view together below the rest. */
function Sidebar({ cards }: { cards: Array<SidebarCard> }) {
  const leading = cards.filter((card) => card.kind !== "index");
  const index = cards.filter((card) => card.kind === "index");
  return (
    <aside className="namecard-sidebar" data-shell-region="sidebar">
      {leading.map((card, position) => (
        <div
          key={card.id}
          className="namecard-sidebar-card fuwari-onload-animation"
          style={{
            animationDelay: `${CARD_DELAY_MS + position * CARD_STEP_MS}ms`,
          }}
        >
          {card.content}
        </div>
      ))}
      {index.length > 0 ? (
        <div className="namecard-sidebar-index">
          {index.map((card, position) => (
            <div
              key={card.id}
              className="namecard-sidebar-card fuwari-onload-animation"
              style={{
                animationDelay: `${CARD_DELAY_MS + (leading.length + position) * CARD_STEP_MS}ms`,
              }}
            >
              {card.content}
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

export const namecardShell: ThemeShell = {
  id: "namecard",
  Shell: NamecardShell,
  identityInFirstScreen: ["home"],
  taglineOn: ["home"],
};
