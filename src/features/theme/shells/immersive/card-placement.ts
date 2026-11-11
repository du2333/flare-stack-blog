import type { PageKind, SidebarCard } from "@/features/theme/theme-shell";

/**
 * Where a group of cards stands from 1024px: before the content or after
 * it. Below that every group follows the content (immersive.css).
 */
export type CardPlace = "before" | "after";

/**
 * The cards of a page by the place 「沉浸」 gives them, each place in the
 * order given; every card goes to exactly one. On the home page the ways
 * into the Posts lead the list. Every other card there, and every card of any
 * other page, follows the content.
 */
export function placeCards(
  pageKind: PageKind,
  cards: Array<SidebarCard>,
): Record<CardPlace, Array<SidebarCard>> {
  if (pageKind !== "home") return { before: [], after: cards };
  return {
    before: cards.filter((card) => card.kind === "index"),
    after: cards.filter((card) => card.kind !== "index"),
  };
}
