import type { PublicMoment } from "@/features/moments/schema/moments.schema";

/** Characters of a Moment's text a page title uses. */
export const MOMENT_TITLE_LENGTH = 40;
const MOMENT_DESCRIPTION_LENGTH = 160;

function firstCharacters(text: string, length: number) {
  // Code points, so an emoji is not cut in two.
  return Array.from(text.replace(/\s+/gu, " ").trim())
    .slice(0, length)
    .join("");
}

/**
 * A Moment's title: the first 40 characters of its text, or `fallback` for
 * one with only images or a video (the caller names it in the reader's language).
 */
export function momentTitle(
  moment: Pick<PublicMoment, "text">,
  fallback: string,
) {
  return firstCharacters(moment.text, MOMENT_TITLE_LENGTH) || fallback;
}

/** The text a share card shows under the title. */
export function momentDescription(moment: Pick<PublicMoment, "text">) {
  return firstCharacters(moment.text, MOMENT_DESCRIPTION_LENGTH);
}
