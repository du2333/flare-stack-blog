import { describe, expect, it } from "vitest";
import type { PageKind, SidebarCard } from "../../theme-shell";
import {
  CARD_PLACEMENTS,
  DEFAULT_CARD_PLACEMENT,
  isCardPlacement,
  placeCards,
  type CardPlace,
} from "./card-placement";

function card(id: string, kind: SidebarCard["kind"]): SidebarCard {
  return { id, kind, content: null };
}

const profile = card("profile", "identity");
const moments = card("latest-moments", "feed");
const categories = card("categories", "index");
const tags = card("tags", "index");

/** The cards the host gives 「沉浸」 on each kind of page, in its order. */
const CARDS = {
  home: [moments, categories, tags],
  inner: [profile, categories, tags],
  post: [profile, categories, tags],
  focused: [],
} satisfies Record<PageKind, Array<SidebarCard>>;

const PAGE_KINDS = Object.keys(CARDS) as Array<PageKind>;

/** The ids of the cards in each place. */
function ids(placed: Record<CardPlace, Array<SidebarCard>>) {
  return {
    before: placed.before.map(({ id }) => id),
    beside: placed.beside.map(({ id }) => id),
    after: placed.after.map(({ id }) => id),
  };
}

describe("the card placements", () => {
  it("are under the list, the default, and beside the content", () => {
    expect(CARD_PLACEMENTS).toEqual(["below", "beside"]);
    expect(DEFAULT_CARD_PLACEMENT).toBe("below");
  });

  it("are told from anything else a stored option may hold", () => {
    for (const placement of CARD_PLACEMENTS) {
      expect(isCardPlacement(placement)).toBe(true);
    }
    for (const value of ["right", "", undefined, null, 1, true]) {
      expect(isCardPlacement(value)).toBe(false);
    }
  });
});

describe("placeCards under the list", () => {
  it("leads the home page with the ways into the Posts, the rest after the content", () => {
    expect(ids(placeCards("home", CARDS.home, "below"))).toEqual({
      before: ["categories", "tags"],
      beside: [],
      after: ["latest-moments"],
    });
  });

  it.each(["inner", "post"] as const)(
    "puts every card of a %s page after the content",
    (pageKind) => {
      expect(ids(placeCards(pageKind, CARDS[pageKind], "below"))).toEqual({
        before: [],
        beside: [],
        after: ["profile", "categories", "tags"],
      });
    },
  );

  it("is what a page gets when no placement is said", () => {
    for (const pageKind of PAGE_KINDS) {
      expect(placeCards(pageKind, CARDS[pageKind])).toEqual(
        placeCards(pageKind, CARDS[pageKind], DEFAULT_CARD_PLACEMENT),
      );
    }
  });
});

describe("placeCards beside the content", () => {
  it.each(["home", "inner"] as const)(
    "stands every card of a %s page in the column, in the given order",
    (pageKind) => {
      expect(placeCards(pageKind, CARDS[pageKind], "beside")).toEqual({
        before: [],
        beside: CARDS[pageKind],
        after: [],
      });
    },
  );

  it("does not reach a Post's page, whose cards stay where they are under the list", () => {
    expect(placeCards("post", CARDS.post, "beside")).toEqual(
      placeCards("post", CARDS.post, "below"),
    );
    expect(ids(placeCards("post", CARDS.post, "beside")).beside).toEqual([]);
  });
});

describe.each(CARD_PLACEMENTS)("placeCards with %s", (placement) => {
  it.each(PAGE_KINDS)(
    "gives every card of a %s page exactly one place",
    (pageKind) => {
      const placed = placeCards(pageKind, CARDS[pageKind], placement);

      expect(
        [...placed.before, ...placed.beside, ...placed.after]
          .map(({ id }) => id)
          .sort(),
      ).toEqual(CARDS[pageKind].map(({ id }) => id).sort());
    },
  );

  it("has no card to place on a focused page", () => {
    expect(placeCards("focused", CARDS.focused, placement)).toEqual({
      before: [],
      beside: [],
      after: [],
    });
  });
});
