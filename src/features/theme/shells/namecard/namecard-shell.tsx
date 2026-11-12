import { useCallback, useRef } from "react";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type {
  SidebarCard,
  ThemeShell,
  ThemeShellProps,
} from "@/features/theme/theme-shell";
import { placeCards, type CardPlace } from "./card-placement";
import { FirstScreen } from "./first-screen";
import { DEFAULT_FRAME, isFrame } from "./frame";
import { Navbar } from "./navbar";

/** Sidebar cards come in after the navbar, 50ms apart. */
const CARD_DELAY_MS = 100;
const CARD_STEP_MS = 50;

/**
 * 「名片」: a bare navbar and, on the home page, a first screen that
 * introduces the author beside the banner in a frame. The page under it
 * keeps the first screen's two columns, as a spread: the content, flat on
 * the page, under the greeting, and from 1024px the sidebar cards in a right
 * column under the frame, as wide as the portrait frame, each in the form
 * that width calls for and the ways into the Posts staying in view. On a
 * Post's page the right column is the table of contents', there from the
 * top of the page, and the cards follow the article (card-placement.ts says
 * which card goes where, namecard.css how each place looks); a Post without
 * headings has no table of contents, and the stylesheet keeps its cards in
 * the right column, which would stand empty. Below 1024px there is one
 * column, the cards after the content.
 *
 * Back to top and the page's actions stand in a box of the shell's, which
 * the stylesheet places from 1024px: right of the page where the window has
 * room there, and in the room between the two columns where it has not.
 */
function NamecardShell({
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
  const isHomePage = pageKind === "home";
  const frame = isFrame(options.frame) ? options.frame : DEFAULT_FRAME;
  // The first screen answers the click; the body is laid out for the page
  // that can be seen, so neither page shows in the layout of the other.
  const isFocusedPage = pageOnScreen === "focused";
  // A focused page shows only its content, also while it fades out.
  const cards = placeCards(pageOnScreen, isFocusedPage ? [] : sidebarCards);
  const firstScreenRef = useRef<HTMLElement>(null);
  // The navbar and what unfolds under it, on the home page. Every other
  // page has no first screen: the table of contents of a Post is there
  // from the top of the page, in the right column.
  const homeOnScreen = pageOnScreen === "home";
  const firstScreenHeight = useCallback(() => {
    const firstScreen = firstScreenRef.current;
    if (!homeOnScreen || !firstScreen) return 0;
    return firstScreen.offsetTop + firstScreen.offsetHeight;
  }, [homeOnScreen]);

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
          <main className="namecard-main" data-shell-region="main">
            {children}
          </main>

          <Cards place="beside" cards={cards.beside} />
          <Cards place="after" cards={cards.after} />

          <div
            className="namecard-footer fuwari-onload-animation"
            style={{ animationDelay: "250ms" }}
            data-shell-region="footer"
          >
            {footer}
          </div>

          <div className="namecard-floating">{floatingActions}</div>
        </div>
      </div>
    </FirstScreenProvider>
  );
}

/**
 * The cards of one place, in the given order; nothing when the place has no
 * card. Every card gets a slot of its own, which the stylesheet makes a
 * `card` container: the card takes the form the slot's width calls for.
 *
 * The ways into the Posts stand together below the other cards, in a box of
 * their own, which the stylesheet keeps in view where the group stands in
 * the right column and which is no box anywhere else.
 */
function Cards({
  place,
  cards,
}: {
  place: CardPlace;
  cards: Array<SidebarCard>;
}) {
  if (cards.length === 0) return null;
  const pinned = cards.filter((card) => card.kind === "index");
  const others = cards.filter((card) => !pinned.includes(card));
  const slot = (card: SidebarCard, position: number) => (
    <div
      key={card.id}
      className="namecard-card fuwari-onload-animation"
      data-kind={card.kind}
      style={{
        animationDelay: `${CARD_DELAY_MS + position * CARD_STEP_MS}ms`,
      }}
    >
      {card.content}
    </div>
  );
  return (
    <aside
      className="namecard-cards"
      data-place={place}
      data-shell-region="sidebar"
    >
      {others.map(slot)}
      {pinned.length > 0 ? (
        <div className="namecard-cards-pinned">
          {pinned.map((card, position) => slot(card, others.length + position))}
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
