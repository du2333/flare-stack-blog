export const ADMIN_ITEMS_PER_PAGE = 12;

/** The last page number an address or an API input may name. */
export const MAX_PAGE_NUMBER = 1_000_000;

/** The longest search text the Admin's lists and their API inputs take. */
export const SEARCH_TEXT_MAX_LENGTH = 200;

export const CACHE_CONTROL = {
  public: {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  },
  // Public HTML and site documents. Every content change purges by Cache-Tag,
  // so the edge can keep them a day; media keeps the shorter `public`.
  html: {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  },
  swr: {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control": "public, s-maxage=1, stale-while-revalidate=604800",
  },
  // Media keeps its address when its file is replaced, so browsers revalidate
  // every time; the edge keeps a copy until the replace purges it by Cache-Tag.
  media: {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control": "public, max-age=31536000",
  },
  immutable: {
    "Cache-Control": "public, max-age=31536000, immutable",
    "CDN-Cache-Control": "public, max-age=31536000, immutable",
  },
  forbidden: {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control": "public, s-maxage=3600",
  },
  notFound: {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control": "public, s-maxage=10",
  },
  serverError: {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control": "public, s-maxage=10",
  },
  private: {
    "Cache-Control": "private, no-store, no-cache, must-revalidate",
    "CDN-Cache-Control": "private, no-store",
  },
} as const;
