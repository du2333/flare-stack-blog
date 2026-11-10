import { z } from "zod";
import { FIXTURE_THEMES } from "virtual:fixture-themes";
import { m } from "@/paraglide/messages";
import type { ThemeRecipe } from "./recipe-placeholder";
import { classicShell } from "./shells/classic/classic-shell";
import classicStylesheet from "./shells/classic/classic-shell.css?url";
import { BUILT_IN_THEME_IDS, type ThemeId } from "./theme-ids";
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
  recipe: ThemeRecipe;
  /**
   * Its own options in Site Config (`theme.options[<id>]`), flat. Give every
   * field a `.catch(<default>)`, so a missing or stale value reads as its
   * default.
   */
  options: z.ZodType<ThemeOptionValues>;
}

const classicTheme: Theme = {
  id: "classic",
  name: m.theme_classic_name,
  shell: classicShell,
  stylesheet: classicStylesheet,
  recipe: {},
  options: z.object({}),
};

const BUILT_IN_THEMES = {
  classic: classicTheme,
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
