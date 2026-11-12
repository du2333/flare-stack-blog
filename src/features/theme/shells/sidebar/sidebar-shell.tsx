import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type {
  SidebarCard,
  ThemeShell,
  ThemeShellProps,
} from "@/features/theme/theme-shell";
import { Banner, Headline } from "./banner";
import {
  DEFAULT_INNER_BANNER,
  DEFAULT_TOC_PLACE,
  isInnerBanner,
  isTocPlace,
} from "./options";
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
 * on an inner page unless the option 「内页横幅」 says none, never on a Post's
 * page or a focused one), the page, every sidebar card in its wide form,
 * and the footer.
 *
 * A Post's page is a reading column, centred right of the rail, with the
 * cards and the footer as wide as the article. Its table of contents stands
 * in the rail, in the place of who writes here, which folds away for it;
 * with the option 「文章页目录位置」 set beside the article it stands right of
 * the column instead and the rail is as on any page (options.ts,
 * sidebar.css). The shell lays every page out by the page `main` holds, not
 * by the address (`pageOnScreen`), and the rail folds by what the page
 * itself says, so nothing of one page shows in the layout of the other.
 *
 * The rail says what the profile card says, so the stylesheet hides that
 * card's slot wherever the rail shows who writes here, and shows it
 * wherever the rail does not: below 1024px, and on a Post whose table of
 * contents has taken that place. The host therefore gives the card on
 * every page (`identityInFirstScreen` names none), and it is always in the
 * document.
 *
 * A focused page keeps the rail, as any other page does.
 *
 * Back to top and the page's actions stand in a box of the shell's. Where
 * the window has no room right of the frame, from 1024px, the stylesheet
 * rests that box in the foot of the rail, at the end of the row of social
 * links, so back to top never lies on the content.
 */
function SidebarShell({
  pageKind,
  pageOnScreen,
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
  const innerBanner = isInnerBanner(options.banner)
    ? options.banner
    : DEFAULT_INNER_BANNER;
  const tocPlace = isTocPlace(options.toc) ? options.toc : DEFAULT_TOC_PLACE;
  const isHomePage = pageOnScreen === "home";
  const isPostPage = pageOnScreen === "post";
  const hasBanner =
    isHomePage || (pageOnScreen === "inner" && innerBanner === "low");
  // Whether a Post's page was on either side of the last change of the page
  // on screen. What stands above the page (the banner, the headline) then
  // comes or goes at once rather than folds, because the column changes
  // width in the same frame.
  const [last, setLast] = useState({
    page: pageOnScreen,
    before: pageOnScreen,
  });
  if (pageOnScreen !== last.page) {
    setLast({ page: pageOnScreen, before: last.page });
  }
  const before = pageOnScreen === last.page ? last.before : last.page;
  const swapped = isPostPage || before === "post";
  // On the way into a Post's page what stands above the page fades with it.
  const leaving = pageKind === "post" && !isPostPage;
  const bannerRef = useRef<HTMLDivElement>(null);
  // The first screen ends at the lower edge of the banner. A page without
  // one has no first screen to scroll past: the table of contents of a Post
  // is there from the top of the page, beside the article as in the rail.
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
  const instant = swapped || traversing;
  const chrome = { navOptions, user, isLoading: isSessionLoading, logout };

  return (
    <FirstScreenProvider height={firstScreenHeight}>
      <div
        className="sidebar-shell"
        data-theme-shell="sidebar"
        data-home={isHomePage}
        data-column={isPostPage ? "reading" : undefined}
        data-toc={tocPlace}
        data-instant={traversing}
      >
        <TopBar {...chrome} />

        <div className="sidebar-frame" data-shell-region="body">
          <Rail {...chrome} tocSlot={tocPlace === "rail"} />

          <div className="sidebar-content">
            <Headline shown={isHomePage} instant={instant} leaving={leaving} />
            <Banner
              ref={bannerRef}
              home={isHomePage}
              shown={hasBanner}
              instant={instant}
              leaving={leaving}
            />

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

          <div className="sidebar-floating">{floatingActions}</div>
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
