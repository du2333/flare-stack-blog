import { describe, expect, it } from "vitest";
import type { PageKind, SidebarCard } from "../../theme-shell";
import { placeCards } from "./card-placement";

function card(id: string, kind: SidebarCard["kind"]): SidebarCard {
  return { id, kind, content: null };
}

const profile = card("profile", "identity");
const moments = card("latest-moments", "feed");
const categories = card("categories", "index");
const tags = card("tags", "index");

/** The cards the host gives 「名片」 on each kind of page, in its order. */
const CARDS = {
  home: [moments, categories, tags],
  inner: [profile, categories, tags],
  post: [profile, categories, tags],
  focused: [],
} satisfies Record<PageKind, Array<SidebarCard>>;

const PAGE_KINDS = Object.keys(CARDS) as Array<PageKind>;

describe("placeCards", () => {
  it.each(["home", "inner"] as const)(
    "stands every card of a %s page in the right column, in the given order",
    (pageKind) => {
      expect(placeCards(pageKind, CARDS[pageKind])).toEqual({
        beside: CARDS[pageKind],
        after: [],
      });
    },
  );

  it("puts every card of a Post's page after the article, in the given order", () => {
    expect(placeCards("post", CARDS.post)).toEqual({
      beside: [],
      after: CARDS.post,
    });
  });

  it.each(PAGE_KINDS)(
    "gives every card of a %s page exactly one place",
    (pageKind) => {
      const placed = placeCards(pageKind, CARDS[pageKind]);

      expect([...placed.beside, ...placed.after]).toEqual(CARDS[pageKind]);
    },
  );

  it("has no card to place on a focused page", () => {
    expect(placeCards("focused", CARDS.focused)).toEqual({
      beside: [],
      after: [],
    });
  });
});
