/**
 * 「侧栏」's own options, stored in Site Config as
 * `theme.options.sidebar.banner` and `theme.options.sidebar.toc`. The first
 * value of each is the default, which a missing or unknown stored value
 * reads as.
 */

/**
 * The banner of the inner pages: a low band, or none. The home page keeps
 * its tall banner and a Post's page never has one, whatever this says.
 */
export const INNER_BANNERS = ["low", "none"] as const;
export type InnerBanner = (typeof INNER_BANNERS)[number];
export const DEFAULT_INNER_BANNER: InnerBanner = "low";

export function isInnerBanner(value: unknown): value is InnerBanner {
  return INNER_BANNERS.some((banner) => banner === value);
}

/**
 * Where the table of contents of a Post stands from 1024px: in the rail,
 * where it takes the place of the avatar, the author and the description,
 * or beside the article, right of it, with the rail as on any other page.
 * Below 1024px the button in the floating column opens it either way.
 */
export const TOC_PLACES = ["rail", "beside"] as const;
export type TocPlace = (typeof TOC_PLACES)[number];
export const DEFAULT_TOC_PLACE: TocPlace = "rail";

export function isTocPlace(value: unknown): value is TocPlace {
  return TOC_PLACES.some((place) => place === value);
}
