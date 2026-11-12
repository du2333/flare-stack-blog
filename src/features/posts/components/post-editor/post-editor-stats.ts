const CJK = /[぀-ヿ㐀-鿿가-힯豈-﫿]/g;
const WORD = /[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu;

/** Characters a minute for Chinese, Japanese and Korean text. */
const CJK_PER_MINUTE = 400;
/** Words a minute for text written with spaces. */
const WORDS_PER_MINUTE = 220;

export interface TextStats {
  /** Han, kana and hangul characters, plus the words of everything else. */
  count: number;
  /** Whole minutes to read it, at least 1 once there is something to read. */
  minutes: number;
}

/**
 * How long a text is, the way its writer counts it: every Chinese, Japanese
 * or Korean character is one, and so is every word written with spaces.
 */
export function textStats(text: string): TextStats {
  const characters = text.match(CJK)?.length ?? 0;
  const words = text.replace(CJK, " ").match(WORD)?.length ?? 0;
  const count = characters + words;
  return {
    count,
    minutes:
      count === 0
        ? 0
        : Math.max(
            1,
            Math.round(characters / CJK_PER_MINUTE + words / WORDS_PER_MINUTE),
          ),
  };
}

export interface OutlineItem {
  /** The heading's position in the document. */
  pos: number;
  level: number;
  text: string;
}

interface OutlineNode {
  type: { name: string };
  attrs: Record<string, unknown>;
  textContent: string;
}

/** The headings of a document that have text, in order. */
export function outlineOf(doc: {
  descendants: (
    visit: (node: OutlineNode, pos: number) => boolean | void,
  ) => void;
}): Array<OutlineItem> {
  const items: Array<OutlineItem> = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return true;
    const text = node.textContent.trim();
    if (text) items.push({ pos, level: Number(node.attrs.level) || 2, text });
    return false;
  });
  return items;
}
