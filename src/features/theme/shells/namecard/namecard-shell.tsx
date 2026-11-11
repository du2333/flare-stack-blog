import { useCallback, useRef, useState, type RefObject } from "react";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import { useReadingColumn } from "@/features/theme/hooks/use-reading-column";
import type {
  PageKind,
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
 * The kind of the page on screen. `pageKind` changes with the address, while
 * the page that is left is still fading out; the body is laid out for the
 * page that can be seen, so neither page shows in the layout of the other.
 * A Post's page takes over, and gives way, in the commit that swaps the
 * pages (`useReadingColumn`). Among the other kinds nothing waits.
 */
function usePageOnScreen(
  pageKind: PageKind,
  mainRef: RefObject<HTMLElement | null>,
): PageKind {
  const reading = useReadingColumn(pageKind === "post", mainRef);
  // The page a Post's page comes in after: the one that is fading out.
  const [left, setLeft] = useState<PageKind>(
    pageKind === "post" ? "inner" : pageKind,
  );
  if (pageKind !== "post" && pageKind !== left) setLeft(pageKind);
  if (reading) return "post";
  return pageKind === "post" ? left : pageKind;
}

/**
 * 「名片」: a bare navbar and, on the home page, a first screen that
 * introduces the author beside the banner in a frame. The page under it
 * keeps the first screen's two columns, as a spread: the content, flat on
 * the page, under the greeting, and from 1024px the sidebar cards in a right
 * column under the frame, as wide as the portrait frame, each in the form
 * that width calls for and the ways into the Posts staying in view. On a
 * Post's page the right column is the table of contents' and the cards
 * follow the article (card-placement.ts says which card goes where,
 * namecard.css how each place looks). Below 1024px there is one column, the
 * cards after the content.
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
  const frame = isFrame(options.frame) ? options.frame : DEFAULT_FRAME;
  const mainRef = useRef<HTMLElement>(null);
  const page = usePageOnScreen(pageKind, mainRef);
  const isFocusedPage = page === "focused";
  // A focused page shows only its content, also while it fades out.
  const cards = placeCards(page, isFocusedPage ? [] : sidebarCards);
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
          <main
            ref={mainRef}
            className="namecard-main"
            data-shell-region="main"
          >
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

          {floatingActions}
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
 * Beside the content the ways into the Posts stand together below the other
 * cards, in a box of their own that the stylesheet keeps in view.
 */
function Cards({
  place,
  cards,
}: {
  place: CardPlace;
  cards: Array<SidebarCard>;
}) {
  if (cards.length === 0) return null;
  const pinned =
    place === "beside" ? cards.filter((card) => card.kind === "index") : [];
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
