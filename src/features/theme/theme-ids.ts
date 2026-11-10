/**
 * The ids of the built-in Themes, in the order the registry (`themes.ts`)
 * lists them. The first one is the default, which a stored id that is not
 * listed falls back to. Kept apart from the registry so Site Config can check
 * an id without loading the shells.
 */
export const BUILT_IN_THEME_IDS = ["classic"] as const;
export type ThemeId = (typeof BUILT_IN_THEME_IDS)[number];
export const DEFAULT_THEME_ID: ThemeId = BUILT_IN_THEME_IDS[0];

/**
 * Every id Site Config accepts: the built-in ones, plus the test fixture
 * Theme's in a build made with THEME_FIXTURE=1 only
 * (`scripts/vite-theme-fixture.ts`). Outside Vite the constant is undefined.
 */
export const THEME_IDS: readonly [ThemeId, ...Array<ThemeId>] = [
  ...BUILT_IN_THEME_IDS,
  ...((typeof __FIXTURE_THEME_IDS__ === "undefined"
    ? []
    : __FIXTURE_THEME_IDS__) as ReadonlyArray<ThemeId>),
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEME_IDS.some((id) => id === value);
}
