/**
 * Splits a sentence at its quoted terms, 「删除」 or “Remove”, so a renderer
 * can keep each short term on one line. A quoted name longer than
 * `maxLength` characters is left to wrap with the sentence.
 */
export function splitQuotedTerms(text: string, maxLength = 8) {
  const parts: Array<{ text: string; keep: boolean }> = [];
  let last = 0;
  for (const match of text.matchAll(/「[^」]*」|“[^”]*”/g)) {
    // The two quote marks are not part of the term's length.
    if (match[0].length - 2 > maxLength) continue;
    if (match.index > last)
      parts.push({ text: text.slice(last, match.index), keep: false });
    parts.push({ text: match[0], keep: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), keep: false });
  return parts;
}
