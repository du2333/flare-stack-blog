import type { SiteConfig } from "@/features/config/site-config.schema";
import type { ThemeOptionValues } from "./theme-shell";
import { resolveThemeOptions, selectTheme, THEMES, type Theme } from "./themes";
import {
  THEME_PREVIEW_OPTIONS_PARAM,
  THEME_PREVIEW_PARAM,
} from "./utils/theme-preview-params";

/** A Theme the Admin is looking at before saving it, with its options. */
export interface ThemePreview {
  id: string;
  options: ThemeOptionValues;
}

function parseOptions(value: unknown): Record<string, unknown> {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

/**
 * The preview a page's search asks for: a registered Theme, with each option
 * that is missing or invalid as its default. An unknown Theme asks for none.
 */
export function readThemePreview(
  search: Readonly<Record<string, unknown>>,
  themes: ReadonlyArray<Theme> = THEMES,
): ThemePreview | null {
  const id = search[THEME_PREVIEW_PARAM];
  const theme = themes.find((candidate) => candidate.id === id);
  if (!theme) return null;
  return {
    id: theme.id,
    options: resolveThemeOptions(
      theme,
      parseOptions(search[THEME_PREVIEW_OPTIONS_PARAM]),
    ),
  };
}

/**
 * The preview to render, or null: only an Admin gets one. The viewer is
 * asked only when the search asks for a preview, so an ordinary page never
 * reads the session.
 */
export async function resolveThemePreview(
  search: Readonly<Record<string, unknown>>,
  viewerIsAdmin: () => Promise<boolean>,
  themes: ReadonlyArray<Theme> = THEMES,
): Promise<ThemePreview | null> {
  const preview = readThemePreview(search, themes);
  if (!preview) return null;
  return (await viewerIsAdmin()) ? preview : null;
}

/** The Theme the public pages show: the previewed one, else the saved one. */
export function activeTheme(
  siteConfig: Pick<SiteConfig, "theme">,
  preview: ThemePreview | null | undefined,
  themes: ReadonlyArray<Theme> = THEMES,
): { theme: Theme; options: ThemeOptionValues } {
  if (preview) {
    return { theme: selectTheme(preview.id, themes), options: preview.options };
  }
  const theme = selectTheme(siteConfig.theme.id, themes);
  return {
    theme,
    options: resolveThemeOptions(theme, siteConfig.theme.options[theme.id]),
  };
}
