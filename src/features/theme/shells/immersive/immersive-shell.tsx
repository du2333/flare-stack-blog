import { useRouter } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { PAGE_FADE_MS } from "@/components/layout/page-fade";
import { FirstScreenProvider } from "@/features/theme/components/first-screen";
import type {
  SidebarCard,
  ThemeShell,
  ThemeShellProps,
} from "@/features/theme/theme-shell";
import { useReducedMotion } from "@/hooks/use-motion";
import {
  DEFAULT_CARD_PLACEMENT,
  isCardPlacement,
  placeCards,
  type CardPlace,
} from "./card-placement";
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
 * place looks). With the option 「卡片位置」 set to the column, the cards of
 * the home page and of the inner pages stand in a narrow column right of
 * the content instead, in their narrow forms and after the content in the
 * document, the ways into the Posts staying in view; a Post's page does not
 * follow the option.
 *
 * In the document the cards placed before the content come before it, the
 * order a wide screen shows. Below 1024px the stylesheet moves them after
 * the content, where the keyboard still reaches them first, as it does the
 * sidebar of the other shells.
 */
function ImmersiveShell({
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
  // The banner and the cards of a Post's page are those of any other inner
  // page; its column is the reading column.
  const isHomePage = pageKind === "home";
  const mainRef = useRef<HTMLElement>(null);
  const readingColumn = useReadingColumn(pageKind === "post", mainRef);
  const cards = placeCards(
    pageKind,
    sidebarCards,
    isCardPlacement(options.cards) ? options.cards : DEFAULT_CARD_PLACEMENT,
  );
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
        data-column={readingColumn ? "reading" : undefined}
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

          <main
            ref={mainRef}
            className="immersive-main"
            data-shell-region="main"
          >
            {children}
          </main>

          <Cards place="beside" cards={cards.beside} />
          <Cards place="after" cards={cards.after} />

          <div className="immersive-floating">{floatingActions}</div>

          <div
            className="immersive-footer fuwari-onload-animation"
            style={{ animationDelay: "250ms" }}
            data-shell-region="footer"
          >
            {footer}
          </div>
        </div>
      </div>
    </FirstScreenProvider>
  );
}

/**
 * Whether the column is the reading column of a Post. `PageFade` keeps the
 * page that is left for `PAGE_FADE_MS` while it fades out, and the column
 * waits with it, so neither page is seen at the width of the other. It
 * changes in the frame the next page comes in: the transition around the
 * page (the one element of `main`) drops the class it fades out under in
 * the commit that swaps the pages, and the column follows before that is
 * painted. A timer of its own could fire a frame early, while the page that
 * is left can still be seen; it only stands in where nothing tells. A reader
 * who asked for less motion gets no fade and no wait.
 */
function useReadingColumn(
  post: boolean,
  mainRef: RefObject<HTMLElement | null>,
) {
  const reducedMotion = useReducedMotion();
  const [reading, setReading] = useState(post);
  useEffect(() => {
    if (reading === post) return;
    if (reducedMotion) {
      setReading(post);
      return;
    }
    const timer = window.setTimeout(() => setReading(post), PAGE_FADE_MS);
    const transition = mainRef.current?.firstElementChild;
    if (!transition || typeof MutationObserver === "undefined") {
      return () => window.clearTimeout(timer);
    }
    // It takes that class a commit after the address has changed, which is
    // not the moment: only a class that goes is.
    const observer = new MutationObserver((records) => {
      const dropped = records.some(
        ({ oldValue }) => (oldValue ?? "").length > transition.className.length,
      );
      if (!dropped) return;
      observer.disconnect();
      flushSync(() => setReading(post));
    });
    observer.observe(transition, {
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
    });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [mainRef, post, reading, reducedMotion]);
  return reducedMotion ? post : reading;
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
  // Before the content the cards are one surface, which comes in as one.
  const together = place === "before";
  const slot = (card: SidebarCard, position: number) => (
    <div
      key={card.id}
      className={
        together ? "immersive-card" : "immersive-card fuwari-onload-animation"
      }
      data-kind={card.kind}
      style={
        together
          ? undefined
          : { animationDelay: `${CARD_DELAY_MS + position * CARD_STEP_MS}ms` }
      }
    >
      {card.content}
    </div>
  );
  const pinned =
    place === "beside" ? cards.filter((card) => card.kind === "index") : [];
  const others = cards.filter((card) => !pinned.includes(card));
  return (
    <aside
      className={
        together ? "immersive-cards fuwari-onload-animation" : "immersive-cards"
      }
      style={together ? { animationDelay: `${STRIP_DELAY_MS}ms` } : undefined}
      data-place={place}
      data-shell-region="sidebar"
    >
      {others.map(slot)}
      {pinned.length > 0 ? (
        <div className="immersive-cards-pinned">
          {pinned.map((card, position) => slot(card, others.length + position))}
        </div>
      ) : null}
    </aside>
  );
}

export const immersiveShell: ThemeShell = {
  id: "immersive",
  Shell: ImmersiveShell,
  identityInFirstScreen: ["home"],
  taglineOn: ["home"],
};
