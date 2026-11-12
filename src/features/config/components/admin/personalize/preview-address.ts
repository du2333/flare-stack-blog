import { useEffect, useRef, useState } from "react";
import type { FocalPoint } from "@/components/ui/focal-point";
import type { BrandMark } from "@/features/config/site-config.schema";
import type { SiteConfigDraft } from "@/features/theme/site-config-draft";
import { themePreviewHref } from "@/features/theme/utils/theme-preview-params";

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

export type PreviewTarget = { kind: "home" } | { kind: "post"; path: string };

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

/**
 * The address the preview loads: the home page, or the path of a Post, with
 * the preview parameters of `themePreviewHref` (which carry across the
 * navigations inside the preview). It holds the focus and hue it is given, so
 * a reload shows the latest of them.
 */
export function previewAddress(
  values: PreviewValues,
  target: PreviewTarget,
): string {
  const home = themePreviewHref(
    values.themeId,
    values.themeOptions,
    draftOf(values),
  );
  if (target.kind === "home") return home;
  return `${target.path}${home.slice(home.indexOf("?"))}`;
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

const targetKeyOf = (target: PreviewTarget) =>
  target.kind === "home" ? "" : target.path;

/**
 * The address to load for `values`. A change of the Theme, its options, the
 * images, the brand mark or the tagline gives a new address after a short
 * wait; a change of the target gives one at once. A change of the banner focus
 * or the hue alone gives none: the preview follows those in place. Whatever
 * address is built carries the latest focus and hue.
 */
export function usePreviewAddress(
  values: PreviewValues,
  target: PreviewTarget,
  debounceMs = PREVIEW_DEBOUNCE_MS,
): string {
  const latest = useRef({ values, target });
  latest.current = { values, target };
  const [address, setAddress] = useState(() => previewAddress(values, target));
  const valuesKey = reloadKey(values);
  const targetKey = targetKeyOf(target);
  // What the address stands for, so an effect that finds nothing new does
  // not build one: the focus and hue in it would be the moment's, not the
  // address's own.
  const built = useRef({ valuesKey, targetKey });

  useEffect(() => {
    if (built.current.valuesKey === valuesKey) return;
    const timer = setTimeout(() => {
      // A change of the target in the meantime built the address already.
      if (built.current.valuesKey === valuesKey) return;
      built.current = { ...built.current, valuesKey };
      setAddress(previewAddress(latest.current.values, latest.current.target));
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [valuesKey, debounceMs]);

  useEffect(() => {
    if (built.current.targetKey === targetKey) return;
    built.current = { valuesKey: reloadKey(latest.current.values), targetKey };
    setAddress(previewAddress(latest.current.values, latest.current.target));
  }, [targetKey]);

  return address;
}
