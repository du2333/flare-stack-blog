/**
 * The Theme Recipe (ADR 0038): which of the built-in forms of the shared
 * content components a Theme picks. A Theme only chooses here; it never
 * replaces a component. The first form of each item is today's look.
 */
export interface ThemeRecipe {
  /**
   * A Post in the home list: a card on its own surface, or a flat row under a
   * rule with the meta on one line after the summary and a small cover on the
   * right. A row never has the no-cover strip. The Moments timeline follows:
   * each Moment a card, or a flat row under a rule, its composer included.
   */
  postCard: "card" | "row";
  /**
   * The meta of a Post (in the list, on its page, the word count line and the
   * card's reading time and views): items led by an icon block, or plain text
   * with a dot between the items.
   */
  meta: "chips" | "inline";
  /** The pale strip with a chevron on a card without a cover, or none. */
  noCoverStrip: "keep" | "remove";
  /**
   * The short bar before a title: a Post's title in the list and on its page,
   * sidebar cards, the profile card's line under the name, the friend links
   * page and a focused page's title.
   */
  headingAccent: "on" | "off";
  /**
   * A Post's summary on its page: a box with an icon and a label, or a lead
   * paragraph with a thin accent line on its left.
   */
  summary: "box" | "standfirst";
  /**
   * The archive of Posts: a dotted time axis, or each year as a heading over
   * a ruled index of its Posts.
   */
  archive: "timeline" | "index";
}

/** Today's look, which the classic Theme keeps. */
export const DEFAULT_THEME_RECIPE: ThemeRecipe = {
  postCard: "card",
  meta: "chips",
  noCoverStrip: "keep",
  headingAccent: "on",
  summary: "box",
  archive: "timeline",
};
