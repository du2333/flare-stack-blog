/** Characters kept at the end of a long name, besides the extension. */
const TAIL_LENGTH = 4;

const EXTENSION = /\.[A-Za-z0-9]{1,8}$/;

function graphemes(text: string) {
  return Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
    (part) => part.segment,
  );
}

/**
 * Splits a file name where a long one is cut in the middle: `head` is what
 * gives way to an ellipsis, `tail` always shows (the last few characters
 * before the extension, and the extension). A name too short to have a middle
 * comes back as `tail` alone.
 */
export function splitMediaName(name: string): { head: string; tail: string } {
  const extension = name.match(EXTENSION)?.[0] ?? "";
  const stem = extension ? name.slice(0, -extension.length) : name;
  // `.png` alone is a name, not an extension.
  if (!stem) return { head: "", tail: name };
  const characters = graphemes(stem);
  const keep = Math.max(0, characters.length - TAIL_LENGTH);
  return {
    head: characters.slice(0, keep).join(""),
    tail: characters.slice(keep).join("") + extension,
  };
}
