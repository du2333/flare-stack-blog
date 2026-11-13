/**
 * Site Config is one section with one revision, saved whole, but two Admin
 * pages edit it: 「个性化」 owns the presentation fields, 「设置」's site page
 * the rest (identity). A page saves the Site Config it loaded with only its
 * own fields taken from its form, so it never writes back a stale copy of the
 * other page's fields.
 */
export const PERSONALIZE_PAGE = "personalize" as const;

export const PERSONALIZE_SITE_FIELDS: ReadonlyArray<string> = [
  "bannerImage",
  "bannerFocus",
  "avatar",
  "primaryHue",
  "brandMark",
  "tagline",
  "theme",
];

type SitePage = "site" | typeof PERSONALIZE_PAGE;

export function ownsSiteField(page: SitePage, field: string): boolean {
  return (
    PERSONALIZE_SITE_FIELDS.includes(field) === (page === PERSONALIZE_PAGE)
  );
}

/** `loaded` with the fields `page` owns replaced by those of `form`. */
export function siteForSave<T extends object>(
  loaded: T | undefined,
  form: T | undefined,
  page: SitePage,
): T | undefined {
  if (!form) return loaded;
  const saved: Record<string, unknown> = { ...loaded };
  for (const [field, value] of Object.entries(form)) {
    if (ownsSiteField(page, field)) saved[field] = value;
  }
  return saved as T;
}

/** Whether the form's dirty fields of the site include one `page` owns. */
export function ownsDirtySiteField(page: SitePage, dirty: unknown): boolean {
  if (dirty === null || typeof dirty !== "object") return false;
  return Object.entries(dirty).some(
    ([field, value]) => Boolean(value) && ownsSiteField(page, field),
  );
}
