import type { PageKind, SidebarCard } from "@/features/theme/theme-shell";

/**
 * Where the sidebar cards of the home page and the inner pages stand from
 * 1024px: under the list, or in a narrow column right of the content.
 * 「沉浸」's own option, stored in Site Config as
 * `theme.options.immersive.cards`.
 */
export const CARD_PLACEMENTS = ["below", "beside"] as const;
export type CardPlacement = (typeof CARD_PLACEMENTS)[number];
export const DEFAULT_CARD_PLACEMENT: CardPlacement = "below";

export function isCardPlacement(value: unknown): value is CardPlacement {
  return CARD_PLACEMENTS.some((placement) => placement === value);
}

/**
 * Where a group of cards stands from 1024px: before the content, in a
 * column beside it, or after it. Below that every group follows the content
 * (immersive.css).
 */
export type CardPlace = "before" | "beside" | "after";

/**
 * The cards of a page by the place 「沉浸」 gives them, each place in the
 * order given; every card goes to exactly one.
 *
 * Under the list: on the home page the ways into the Posts lead the list;
 * every other card there, and every card of any other page, follows the
 * content. Beside: every card of the home page and of an inner page stands
 * in the column. A Post's page does not follow the placement: its cards
 * are where they are under the list.
 */
export function placeCards(
  pageKind: PageKind,
  cards: Array<SidebarCard>,
  placement: CardPlacement = DEFAULT_CARD_PLACEMENT,
): Record<CardPlace, Array<SidebarCard>> {
  if (placement === "beside" && pageKind !== "post") {
    return { before: [], beside: cards, after: [] };
  }
  if (pageKind !== "home") return { before: [], beside: [], after: cards };
  return {
    before: cards.filter((card) => card.kind === "index"),
    beside: [],
    after: cards.filter((card) => card.kind !== "index"),
  };
}
