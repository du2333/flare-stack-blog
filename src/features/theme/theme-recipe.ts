/**
 * The Theme Recipe (ADR 0038): which of the built-in forms of the shared
 * content components a Theme picks. A Theme only chooses here; it never
 * replaces a component. The first form of each item is today's look.
 */
export interface ThemeRecipe {
  /**
   * A Post in the home list: a card on its own surface, a flat row under a
   * rule with the meta on one line after the summary and a small cover on the
   * right, or a tile led by its cover with the title, the summary and one
   * line of meta under it. A form includes its arrangement: cards and rows
   * are one column; tiles stand two abreast where the list is wide enough,
   * each row of them as tall as its tallest. A tile without a cover is led by
   * a plate with the first character of its title, and pinned and popular
   * are a label on the lead. A row and a tile never have the no-cover strip;
   * a tile never has the bar before its title either, and its meta is always
   * plain text. The Moments timeline follows, always in one column: each
   * Moment a card (also where Posts are tiles), or a flat row under a rule,
   * its composer included.
   */
  postCard: "card" | "row" | "tile";
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
  /**
   * The footer: a centred caption under a rule (the copyright, the feed and
   * sitemap links, the credit), or a closing band, a surface as wide as the
   * shell lets its footer region be: the brand mark and the site title over
   * the tagline and the social links on one side, every navigation entry on
   * the other, then one quiet line with the copyright and the feed and
   * sitemap links, without the credit; or a colophon, one quiet line under a
   * rule at the end of the content: the feed and sitemap links at one end
   * and the copyright in small at the other, naming nobody, for a Theme
   * whose frame already shows who writes here. Each form is a module of its
   * own in `components/layout/footer/`, whose `index.tsx` picks it by this
   * value.
   */
  footer: "caption" | "band" | "colophon";
}

/** Today's look, which the classic Theme keeps. */
export const DEFAULT_THEME_RECIPE: ThemeRecipe = {
  postCard: "card",
  meta: "chips",
  noCoverStrip: "keep",
  headingAccent: "on",
  summary: "box",
  archive: "timeline",
  footer: "caption",
};
