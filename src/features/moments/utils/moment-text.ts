export type MomentTextPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string };

// An address ends at white space, a quote, or CJK text and punctuation: a
// Chinese sentence rarely puts a space after the link it ends with.
const URL_RE = /https?:\/\/[^\s<>"'　-鿿＀-￯]+/giu;

/** An address as readers click it: the sentence's own punctuation is not part of it. */
function trimAddress(address: string) {
  let end = address.length;
  while (end > 0) {
    const last = address[end - 1];
    if (".,;:!?".includes(last)) end -= 1;
    // A closing bracket belongs to the address only when it opens inside it.
    else if (last === ")" && !address.slice(0, end).includes("(")) end -= 1;
    else break;
  }
  return address.slice(0, end);
}

function isWebAddress(address: string) {
  try {
    const { protocol } = new URL(address);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A Moment's text as the page shows it: plain text, with each web address a
 * link. Line breaks stay in the text parts for the page to keep.
 */
export function splitMomentText(text: string): Array<MomentTextPart> {
  const parts: Array<MomentTextPart> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_RE)) {
    const address = trimAddress(match[0]);
    if (!isWebAddress(address)) continue;
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", value: address });
    lastIndex = match.index + address.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}
