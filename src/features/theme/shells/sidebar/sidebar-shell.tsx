import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type {
  SidebarCard,
  ThemeShell,
  ThemeShellProps,
} from "@/features/theme/theme-shell";
import { Banner, Headline } from "./banner";
import { Rail } from "./rail";
import { TopBar } from "./top-bar";

/** The cards come in after the content, 50ms apart. */
const CARD_DELAY_MS = 150;
const CARD_STEP_MS = 50;

/**
 * 「侧栏」: from 1024px a rail on the left is the frame of every page. It
 * carries the brand, who writes here, search and the navigation, and at its
 * foot the social links, the account entry and the switches (rail.tsx).
 * Below 1024px there is no rail: a bar at the top with the shared compact
 * menu stands in for it (top-bar.tsx).
 *
 * Right of the rail is one content column: on the home page the tagline as
 * a headline, then the banner as a rounded band (tall on the home page, low
 * elsewhere, none on a focused page), the page, every sidebar card in its
 * wide form, and the footer.
 *
 * The rail says what the profile card says, so the stylesheet hides that
 * card's slot from 1024px and shows it below, where the rail is not
 * (sidebar.css). The host therefore gives the card on every page
 * (`identityInFirstScreen` names none), and it is always in the document.
 *
 * A focused page keeps the rail, as any other page does, and has no banner.
 * A Post's page is laid out as an inner page.
 */
function SidebarShell({
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
  const isHomePage = pageKind === "home";
  const bannerRef = useRef<HTMLDivElement>(null);
  // The first screen ends at the lower edge of the banner; a page without
  // one has no first screen to scroll past.
  const firstScreenHeight = useCallback(() => {
    const banner = bannerRef.current;
    if (!banner) return 0;
    return Math.max(0, banner.getBoundingClientRect().bottom + window.scrollY);
  }, []);
  // Going back or forward resizes the banner at once: the router restores
  // the scroll position then, and needs the page at its final height.
  const router = useRouter();
  const [traversing, setTraversing] = useState(false);
  useEffect(
    () =>
      router.history.subscribe(({ action }) =>
        setTraversing(action.type !== "PUSH" && action.type !== "REPLACE"),
      ),
    [router],
  );
  const chrome = { navOptions, user, isLoading: isSessionLoading, logout };

  return (
    <FirstScreenProvider height={firstScreenHeight}>
      <div
        className="sidebar-shell"
        data-theme-shell="sidebar"
        data-home={isHomePage}
        data-instant={traversing}
      >
        <TopBar {...chrome} />

        <div className="sidebar-frame" data-shell-region="body">
          <Rail {...chrome} />

          <div className="sidebar-content">
            <Headline home={isHomePage} />
            {pageKind === "focused" ? null : (
              <Banner ref={bannerRef} home={isHomePage} />
            )}

            <main className="sidebar-main" data-shell-region="main">
              {children}
            </main>

            <Cards cards={sidebarCards} />

            <div
              className="sidebar-footer fuwari-onload-animation"
              style={{ animationDelay: "250ms" }}
              data-shell-region="footer"
            >
              {footer}
            </div>
          </div>

          {floatingActions}
        </div>
      </div>
    </FirstScreenProvider>
  );
}

/**
 * The sidebar cards, one group after the content, in the given order;
 * nothing when the page has none. Every card gets a slot of its own, which
 * the stylesheet makes a `card` container, so the card takes the form the
 * slot's width calls for; the slot says what kind of card it holds.
 */
function Cards({ cards }: { cards: Array<SidebarCard> }) {
  if (cards.length === 0) return null;
  return (
    <aside className="sidebar-cards" data-shell-region="sidebar">
      {cards.map((card, position) => (
        <div
          key={card.id}
          className="sidebar-card fuwari-onload-animation"
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

export const sidebarShell: ThemeShell = {
  id: "sidebar",
  Shell: SidebarShell,
  identityInFirstScreen: [],
  taglineOn: ["home"],
};
