import type { PageKind, SidebarCard } from "@/features/theme/theme-shell";

/**
 * Where a group of cards stands from 1024px: in the column right of the
 * content, which is the frame's on the first screen, or after the content in
 * the content's own column. Below that every group follows the content
 * (namecard.css).
 */
export type CardPlace = "beside" | "after";

/**
 * The cards of a page by the place 「名片」 gives them, in the order given;
 * every card goes to exactly one. They stand in the right column, except on
 * a Post's page: there that column is the table of contents', and the cards
 * follow the article. Whether a Post has a table of contents only its page
 * says: the stylesheet keeps the cards of one that has none in the right
 * column (namecard.css).
 */
export function placeCards(
  pageKind: PageKind,
  cards: Array<SidebarCard>,
): Record<CardPlace, Array<SidebarCard>> {
  return pageKind === "post"
    ? { beside: [], after: cards }
    : { beside: cards, after: [] };
}
