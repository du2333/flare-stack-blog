/**
 * A Moment's text for places that show it outside the page: its feed entries.
 * The text is plain; web addresses in it are links.
 */

/** The most characters of the text a Moment's title in a feed shows. */
export const MOMENT_TITLE_MAX_LENGTH = 40;

export type MomentTextPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string };

// ASCII only, so an address ends where Chinese text follows it.
const WEB_ADDRESS = /https?:\/\/[\w\-.~:/?#[\]@!$&'()*+,;=%]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?'*]$/;

function count(text: string, character: string) {
  return text.split(character).length - 1;
}

/** `address` without the punctuation of the sentence it ends. */
function trimAddress(address: string) {
  let end = address;
  for (;;) {
    if (TRAILING_PUNCTUATION.test(end)) {
      end = end.slice(0, -1);
    } else if (end.endsWith(")") && count(end, "(") < count(end, ")")) {
      end = end.slice(0, -1);
    } else if (end.endsWith("]") && count(end, "[") < count(end, "]")) {
      end = end.slice(0, -1);
    } else {
      return end;
    }
  }
}

/**
 * `text` as parts in order: text, and each `http://` or `https://` address as
 * a link. The parts joined give `text` back.
 */
export function momentTextParts(text: string): Array<MomentTextPart> {
  const parts: Array<MomentTextPart> = [];
  let from = 0;
  for (const match of text.matchAll(WEB_ADDRESS)) {
    const address = trimAddress(match[0]);
    // `http://` alone is not an address.
    if (!/^https?:\/\/[^/?#]/.test(address)) continue;
    if (match.index > from) {
      parts.push({ type: "text", value: text.slice(from, match.index) });
    }
    parts.push({ type: "link", value: address });
    from = match.index + address.length;
  }
  if (from < text.length) parts.push({ type: "text", value: text.slice(from) });
  return parts;
}

/**
 * The title a feed gives a Moment, which has none: its text on one line,
 * cut after 40 characters (code points) with an ellipsis. Null when the text
 * is blank.
 */
export function momentTextTitle(text: string) {
  const line = text.replace(/\s+/g, " ").trim();
  if (!line) return null;
  let length = 0;
  let end = 0;
  for (const character of line) {
    if (length === MOMENT_TITLE_MAX_LENGTH) {
      return `${line.slice(0, end).trimEnd()}…`;
    }
    length += 1;
    end += character.length;
  }
  return line;
}
