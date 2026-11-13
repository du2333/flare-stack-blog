import type { ComponentType } from "react";
import { z } from "zod/mini";
import { FIXTURE_THEMES } from "virtual:fixture-themes";
import { m } from "@/paraglide/messages";
import { classicShell } from "./shells/classic/classic-shell";
import classicStylesheet from "./shells/classic/classic-shell.css?url";
import {
  CARD_PLACEMENTS,
  DEFAULT_CARD_PLACEMENT,
} from "./shells/immersive/card-placement";
import { immersiveShell } from "./shells/immersive/immersive-shell";
import immersiveStylesheet from "./shells/immersive/immersive.css?url";
import { DEFAULT_FRAME, FRAMES } from "./shells/namecard/frame";
import { namecardShell } from "./shells/namecard/namecard-shell";
import namecardStylesheet from "./shells/namecard/namecard.css?url";
import {
  DEFAULT_INNER_BANNER,
  DEFAULT_TOC_PLACE,
  INNER_BANNERS,
  TOC_PLACES,
} from "./shells/sidebar/options";
import { sidebarShell } from "./shells/sidebar/sidebar-shell";
import sidebarStylesheet from "./shells/sidebar/sidebar.css?url";
import { BUILT_IN_THEME_IDS, type ThemeId } from "./theme-ids";
import { DEFAULT_THEME_RECIPE, type ThemeRecipe } from "./theme-recipe";
import type { ThemeOptionValues, ThemeShell } from "./theme-shell";

/**
 * A Theme (ADR 0038): what the public pages look like when the Admin selects
 * it in Site Config. Registering one here, with its id in `theme-ids.ts`, is
 * all a new Theme needs; nothing else lists them.
 */
export interface Theme {
  id: string;
  /** Display name, for choosing a Theme in the Admin. */
  name: () => string;
  shell: ThemeShell;
  /**
   * Its shell's styles and its design-variable values, scoped to
   * `:root[data-theme="<id>"]`. The `_public` route links it, and no other
   * Theme's, while the Theme is selected; nothing imports it as CSS.
   */
  stylesheet: string;
  /** Which built-in form of each shared content component it picks. */
  recipe: ThemeRecipe;
  /**
   * Its own options in Site Config (`theme.options[<id>]`), flat, in
   * `zod/mini` like every schema the browser loads on a public page. Give
   * every field a `z.catch(<schema>, <default>)`, so a missing or stale value
   * reads as its default.
   */
  options: z.ZodMiniType<ThemeOptionValues>;
  /** How the Admin edits this Theme's options; only choice lists for now. */
  optionFields?: ReadonlyArray<{
    key: string;
    label: () => string;
    hint?: () => string;
    choices: ReadonlyArray<{ value: string; label: () => string }>;
  }>;
  /**
   * A schematic of its shell for choosing it in the Admin, drawn with the
   * base design variables so it follows the hue and the Admin's Colour
   * Scheme. Without one the picker shows a neutral placeholder. The built-in
   * Themes' are not set here: this registry loads on every public page, and
   * `thumbnails/theme-thumbnail.ts` holds them for the Admin alone.
   */
  thumbnail?: ComponentType;
}

const classicTheme: Theme = {
  id: "classic",
  name: m.theme_classic_name,
  shell: classicShell,
  stylesheet: classicStylesheet,
  recipe: DEFAULT_THEME_RECIPE,
  options: z.object({}),
};

const FRAME_LABELS = {
  portrait: m.theme_namecard_frame_portrait,
  standard: m.theme_namecard_frame_standard,
  wide: m.theme_namecard_frame_wide,
} satisfies Record<(typeof FRAMES)[number], () => string>;

const namecardTheme: Theme = {
  id: "namecard",
  name: m.theme_namecard_name,
  shell: namecardShell,
  stylesheet: namecardStylesheet,
  recipe: {
    postCard: "row",
    meta: "inline",
    noCoverStrip: "remove",
    headingAccent: "off",
    summary: "standfirst",
    archive: "index",
    footer: "signature",
  },
  options: z.object({ frame: z.catch(z.enum(FRAMES), DEFAULT_FRAME) }),
  optionFields: [
    {
      key: "frame",
      label: m.theme_namecard_frame,
      hint: m.theme_namecard_frame_hint,
      choices: FRAMES.map((value) => ({ value, label: FRAME_LABELS[value] })),
    },
  ],
};

const CARD_PLACEMENT_LABELS = {
  below: m.theme_immersive_cards_below,
  beside: m.theme_immersive_cards_beside,
} satisfies Record<(typeof CARD_PLACEMENTS)[number], () => string>;

const immersiveTheme: Theme = {
  id: "immersive",
  name: m.theme_immersive_name,
  shell: immersiveShell,
  stylesheet: immersiveStylesheet,
  recipe: {
    postCard: "tile",
    meta: "inline",
    noCoverStrip: "remove",
    headingAccent: "off",
    summary: "standfirst",
    archive: "covers",
    footer: "band",
  },
  options: z.object({
    cards: z.catch(z.enum(CARD_PLACEMENTS), DEFAULT_CARD_PLACEMENT),
  }),
  optionFields: [
    {
      key: "cards",
      label: m.theme_immersive_cards,
      hint: m.theme_immersive_cards_hint,
      choices: CARD_PLACEMENTS.map((value) => ({
        value,
        label: CARD_PLACEMENT_LABELS[value],
      })),
    },
  ],
};

const INNER_BANNER_LABELS = {
  low: m.theme_sidebar_banner_low,
  none: m.theme_sidebar_banner_none,
} satisfies Record<(typeof INNER_BANNERS)[number], () => string>;

const TOC_PLACE_LABELS = {
  rail: m.theme_sidebar_toc_rail,
  beside: m.theme_sidebar_toc_beside,
} satisfies Record<(typeof TOC_PLACES)[number], () => string>;

const sidebarTheme: Theme = {
  id: "sidebar",
  name: m.theme_sidebar_name,
  shell: sidebarShell,
  stylesheet: sidebarStylesheet,
  recipe: {
    postCard: "tile",
    meta: "inline",
    noCoverStrip: "remove",
    headingAccent: "off",
    summary: "standfirst",
    archive: "index",
    footer: "colophon",
  },
  options: z.object({
    banner: z.catch(z.enum(INNER_BANNERS), DEFAULT_INNER_BANNER),
    toc: z.catch(z.enum(TOC_PLACES), DEFAULT_TOC_PLACE),
  }),
  optionFields: [
    {
      key: "banner",
      label: m.theme_sidebar_banner,
      hint: m.theme_sidebar_banner_hint,
      choices: INNER_BANNERS.map((value) => ({
        value,
        label: INNER_BANNER_LABELS[value],
      })),
    },
    {
      key: "toc",
      label: m.theme_sidebar_toc,
      hint: m.theme_sidebar_toc_hint,
      choices: TOC_PLACES.map((value) => ({
        value,
        label: TOC_PLACE_LABELS[value],
      })),
    },
  ],
};

const BUILT_IN_THEMES = {
  classic: classicTheme,
  namecard: namecardTheme,
  immersive: immersiveTheme,
  sidebar: sidebarTheme,
} satisfies Record<ThemeId, Theme>;

/**
 * Every Theme this build offers, the default first. A THEME_FIXTURE=1 build
 * adds the test fixture Theme (scripts/vite-theme-fixture.ts).
 */
export const THEMES: ReadonlyArray<Theme> = [
  ...BUILT_IN_THEME_IDS.map((id) => BUILT_IN_THEMES[id]),
  ...FIXTURE_THEMES,
];

/** The Theme with this id, or the default one when none has it. */
export function selectTheme(
  id: string,
  themes: ReadonlyArray<Theme> = THEMES,
): Theme {
  return themes.find((theme) => theme.id === id) ?? themes[0]!;
}

/** A Theme's stored options, each missing or invalid one as its default. */
export function resolveThemeOptions(
  theme: Pick<Theme, "options">,
  stored: Readonly<Record<string, unknown>> | undefined,
): ThemeOptionValues {
  const parsed = theme.options.safeParse(stored ?? {});
  return parsed.success ? parsed.data : theme.options.parse({});
}
