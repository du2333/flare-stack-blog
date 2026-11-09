import { isPostSummaryFormat } from "@/features/posts/utils/post-fields";

/**
 * Rules for what a Moment holds, shared by the API and the composer, which
 * can tell the Admin before saving.
 */

/** The most characters a Moment's text holds, counted in code points. */
export const MOMENT_TEXT_MAX_LENGTH = 1000;

/** The most images a Moment shows. */
export const MOMENT_IMAGES_MAX = 50;

/** Moments a public list page shows. */
export const MOMENTS_PER_PAGE = 20;

/** Moments the home sidebar shows. */
export const LATEST_MOMENTS_COUNT = 3;

/**
 * `text`'s length in code points, so an emoji or a character outside the
 * Basic Multilingual Plane counts once, not as the two UTF-16 units
 * `String.length` counts.
 */
export function momentTextLength(text: string) {
  let length = 0;
  for (const _ of text) length += 1;
  return length;
}

/**
 * Whether `text` has no control or format character (Unicode Cc or Cf)
 * besides tab, line feed and carriage return: the rule of a Post's summary,
 * which is multi-line plain text too. A zero width joiner inside an emoji is
 * part of it.
 */
export function isMomentTextFormat(text: string) {
  return isPostSummaryFormat(text);
}
