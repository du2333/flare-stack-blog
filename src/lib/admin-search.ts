import { z } from "zod/mini";
import { SEARCH_TEXT_MAX_LENGTH } from "@/lib/constants";

// Parameters the Admin's list addresses share, validated with `zod/mini` like
// every search schema (`CODING_STANDARDS.md`). A value that does not parse
// falls back to its default instead of failing the address.

/** `?page=` of an Admin list: a positive whole number, else the first page. */
export const adminPageParam = z.catch(
  z._default(z.int().check(z.positive()), 1),
  1,
);

/** `?search=` of an Admin list: text up to the shared limit, else none. */
export const adminSearchTextParam = z.catch(
  z._default(z.string().check(z.maxLength(SEARCH_TEXT_MAX_LENGTH)), ""),
  "",
);
