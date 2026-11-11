import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type {
  SidebarCard,
  ThemeShell,
  ThemeShellProps,
} from "@/features/theme/theme-shell";
import { placeCards, type CardPlace } from "./card-placement";
import { FirstScreen } from "./first-screen";
import { Navbar } from "./navbar";

/** The strip before the content comes in as one; cards after it, 50ms apart. */
const STRIP_DELAY_MS = 100;
const CARD_DELAY_MS = 150;
const CARD_STEP_MS = 50;

/**
 * 「沉浸」: the banner fills the first screen with the navigation lying on it,
 * tall on the home page, where it introduces the author, and a low band
 * elsewhere. The content rises over its lower edge in one centred column,
 * and the sidebar cards stand in that column in their wide forms: from
 * 1024px the ways into the Posts lead the home page's list as one strip and
 * every other card follows the content; below, all of them follow it
 * (card-placement.ts says which card goes where, immersive.css how each
 * place looks).
 *
 * In the document the cards placed before the content come before it, the
 * order a wide screen shows. Below 1024px the stylesheet moves them after
 * the content, where the keyboard still reaches them first, as it does the
 * sidebar of the other shells.
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
  // A Post's page is laid out as any other inner page.
  const isHomePage = pageKind === "home";
  const cards = placeCards(pageKind, sidebarCards);
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
          <Cards place="before" cards={cards.before} />

          <main className="immersive-main" data-shell-region="main">
            {children}
          </main>

          <Cards place="after" cards={cards.after} />

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

/**
 * The cards of one place, in the given order; nothing when the place has no
 * card. Every card gets a slot of its own, which the stylesheet makes a
 * `card` container: the card takes the form the slot's width calls for.
 */
function Cards({
  place,
  cards,
}: {
  place: CardPlace;
  cards: Array<SidebarCard>;
}) {
  if (cards.length === 0) return null;
  // Before the content the cards are one surface, which comes in as one.
  const together = place === "before";
  return (
    <aside
      className={
        together ? "immersive-cards fuwari-onload-animation" : "immersive-cards"
      }
      style={together ? { animationDelay: `${STRIP_DELAY_MS}ms` } : undefined}
      data-place={place}
      data-shell-region="sidebar"
    >
      {cards.map((card, position) => (
        <div
          key={card.id}
          className={
            together
              ? "immersive-card"
              : "immersive-card fuwari-onload-animation"
          }
          data-kind={card.kind}
          style={
            together
              ? undefined
              : {
                  animationDelay: `${CARD_DELAY_MS + position * CARD_STEP_MS}ms`,
                }
          }
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
