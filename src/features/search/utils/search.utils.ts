import type { search } from "@orama/orama";
import {
  FUZZY_MAX_DISTANCE,
  SCAN_LIMIT,
  SNIPPET_CONTEXT,
  SNIPPET_SLICE,
} from "../service/search.service";

type OramaHit = Awaited<ReturnType<typeof search>>["hits"][number];

export function buildSnippet({
  text,
  terms,
  fallbackTerm,
  options,
}: {
  text?: string | null;
  terms: Array<string>;
  fallbackTerm: string;
  options?: {
    snippetSlice?: number;
    snippetContext?: number;
    scanLimit?: number;
    fuzzyMaxDistance?: number;
  };
}) {
  const snippetSlice = options?.snippetSlice ?? SNIPPET_SLICE;
  const scanLimit = options?.scanLimit ?? SCAN_LIMIT;
  const fuzzyMaxDistance = options?.fuzzyMaxDistance ?? FUZZY_MAX_DISTANCE;

  const source = text?.trim() ?? "";
  if (source.length === 0) return null;

  const activeTerms =
    terms.length > 0 ? terms : fallbackTerm ? [fallbackTerm] : [];

  if (activeTerms.length === 0) {
    return source.slice(0, snippetSlice);
  }

  const lowerSource = source.toLowerCase();
  const match =
    findExactMatch(source, lowerSource, activeTerms) ??
    findApproxMatch(source, activeTerms, scanLimit, fuzzyMaxDistance);

  if (!match) {
    return source.slice(0, snippetSlice);
  }

  const { idx, len, token } = match;

  const start = idx === -1 ? 0 : Math.max(0, idx - SNIPPET_CONTEXT);
  const end =
    idx === -1
      ? Math.min(source.length, SNIPPET_SLICE)
      : Math.min(source.length, idx + len + SNIPPET_CONTEXT);

  const slice = source.slice(start, end);
  const safeSlice = escapeHtml(slice);

  const highlightTerms = [token, ...activeTerms]
    .filter((t) => t && t.length > 0)
    .map((t) => escapeRegExp(escapeHtml(t)));

  const highlightRegex = new RegExp(highlightTerms.join("|"), "gi");

  const highlighted = safeSlice.replace(
    highlightRegex,
    (m) => `<mark>${m}</mark>`,
  );

  return highlighted;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getMatchedTerms(
  hit: OramaHit,
  field: "title" | "summary" | "content",
) {
  const maybeMatches = (
    hit as { matches?: Record<string, Array<{ term?: string }>> }
  ).matches;
  if (!maybeMatches) return [];
  const fieldMatches = maybeMatches[field];
  if (!Array.isArray(fieldMatches)) return [];
  return fieldMatches
    .map((m) => m.term)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
}

function findExactMatch(
  source: string,
  lowerSource: string,
  terms: Array<string>,
): { idx: number; len: number; token: string } | null {
  for (const term of terms) {
    const lowerTerm = term.toLowerCase();
    const exactIdx = lowerSource.indexOf(lowerTerm);
    if (exactIdx !== -1) {
      const expanded = expandToWordBounds(source, exactIdx, lowerTerm.length);
      return expanded;
    }
  }
  return null;
}

function findApproxMatch(
  source: string,
  terms: Array<string>,
  scanLimit: number,
  maxDistance: number,
): { idx: number; len: number; token: string } | null {
  const chunk = source.slice(0, Math.min(scanLimit, source.length));
  const lowerChunk = chunk.toLowerCase();

  for (const term of terms) {
    const lowerTerm = term.toLowerCase();
    const baseLen = lowerTerm.length;
    const lens = [baseLen - 1, baseLen, baseLen + 1].filter((l) => l > 0);

    for (const winLen of lens) {
      const limit = lowerChunk.length - winLen;
      if (limit < 0) continue;

      for (let i = 0; i <= limit; i++) {
        // quick filter: first char should match to reduce cost
        if (lowerChunk[i] !== lowerTerm[0]) continue;
        const candidate = lowerChunk.slice(i, i + winLen);
        if (
          levenshteinWithCutoff(candidate, lowerTerm, maxDistance) > maxDistance
        ) {
          continue;
        }
        const expanded = expandToWordBounds(chunk, i, winLen);
        return expanded;
      }
    }
  }

  return null;
}

function expandToWordBounds(
  source: string,
  idx: number,
  len: number,
): { idx: number; len: number; token: string } {
  const isWord = (ch: string) => /\w/.test(ch);
  let start = idx;
  let end = idx + len;
  while (start > 0 && isWord(source[start - 1])) start--;
  while (end < source.length && isWord(source[end])) end++;
  return { idx: start, len: end - start, token: source.slice(start, end) };
}

function levenshteinWithCutoff(a: string, b: string, max: number): number {
  const aLen = a.length;
  const bLen = b.length;
  if (Math.abs(aLen - bLen) > max) return max + 1;
  const prev = Array.from({ length: bLen + 1 }, () => 0);
  const curr = Array.from({ length: bLen + 1 }, () => 0);
  for (let j = 0; j <= bLen; j++) prev[j] = j;
  for (let i = 1; i <= aLen; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= bLen; j++) prev[j] = curr[j];
  }
  return curr[bLen];
}
