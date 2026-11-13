import { useEffect, useRef, useState } from "react";
import type { FocalPoint } from "@/components/ui/focal-point";
import type { BrandMark } from "@/features/config/site-config.schema";
import type { SiteConfigDraft } from "@/features/theme/site-config-draft";
import {
  embeddedThemePreviewHref,
  themePreviewHref,
} from "@/features/theme/utils/theme-preview-params";

/** What the preview shows: the form's presentation fields, unsaved as they are. */
export interface PreviewValues {
  themeId: string;
  /** The options of the chosen Theme, resolved to their defaults. */
  themeOptions: Readonly<Record<string, unknown>>;
  bannerImage: string;
  bannerFocus: FocalPoint;
  avatar: string;
  primaryHue: number;
  brandMark: BrandMark;
  tagline: string;
}

/** How long a change that reloads the preview waits for the next one. */
export const PREVIEW_DEBOUNCE_MS = 400;

function draftOf(values: PreviewValues): SiteConfigDraft {
  return {
    bannerImage: values.bannerImage,
    bannerFocus: values.bannerFocus,
    avatar: values.avatar,
    primaryHue: values.primaryHue,
    brandMark: values.brandMark,
    tagline: values.tagline,
  };
}

// Where the Admin's own pages and the API live: never a page to preview.
const NOT_PUBLIC = /^\/(?:admin|api)(?:\/|$)/;

/**
 * The path of a public page, or null for anything else: a path that is not
 * one, or one that is the Admin's or the API's.
 */
export function publicPreviewPath(path: unknown): string | null {
  if (typeof path !== "string" || !path.startsWith("/")) return null;
  if (path.startsWith("//") || NOT_PUBLIC.test(path)) return null;
  return path;
}

/**
 * The address the preview loads: the page at `path` (the home page by
 * default) with the preview parameters of `themePreviewHref`, which carry
 * across the navigations inside the preview. It holds the focus and hue it is
 * given, so a reload shows the latest of them.
 */
export function previewAddress(values: PreviewValues, path = "/"): string {
  // Marked as embedded, so the page leaves out the bar that names the preview.
  const home = embeddedThemePreviewHref(
    themePreviewHref(values.themeId, values.themeOptions, draftOf(values)),
  );
  const page = publicPreviewPath(path) ?? "/";
  return page === "/" ? home : `${page}${home.slice(home.indexOf("?"))}`;
}

/** The fields that change the address; the focus and the hue do not. */
function reloadKey(values: PreviewValues): string {
  return JSON.stringify([
    values.themeId,
    values.themeOptions,
    values.bannerImage,
    values.avatar,
    values.brandMark,
    values.tagline,
  ]);
}

/**
 * The address to load for `values`. A change of the Theme, its options, the
 * images, the brand mark or the tagline gives a new address after a short
 * wait; a change of the banner focus or the hue alone gives none, since the
 * preview follows those in place. The new address is on the page the Admin
 * has navigated to in the preview (`currentPath`, null when it cannot be
 * read) and carries the latest focus and hue.
 */
export function usePreviewAddress(
  values: PreviewValues,
  currentPath: () => string | null,
  debounceMs = PREVIEW_DEBOUNCE_MS,
): string {
  const latest = useRef({ values, currentPath });
  latest.current = { values, currentPath };
  const [address, setAddress] = useState(() => previewAddress(values));
  const valuesKey = reloadKey(values);
  // What the address stands for, so an effect that finds nothing new does
  // not build one: the focus and hue in it would be the moment's, not the
  // address's own.
  const built = useRef(valuesKey);

  useEffect(() => {
    if (built.current === valuesKey) return;
    const timer = setTimeout(() => {
      built.current = valuesKey;
      const { values, currentPath } = latest.current;
      setAddress(previewAddress(values, currentPath() ?? "/"));
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [valuesKey, debounceMs]);

  return address;
}
