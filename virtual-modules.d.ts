// Modules that Vite plugins generate at build and dev time.
declare module "virtual:routed-first-segments" {
  /** Lowercased first path segments the route tree owns; see scripts/vite-routed-segments.ts. */
  export const ROUTED_FIRST_SEGMENTS: readonly string[];
}

declare module "virtual:fixture-themes" {
  import type { Theme } from "@/features/theme/themes";
  /** The test fixture Theme in a THEME_FIXTURE=1 build, else empty; see scripts/vite-theme-fixture.ts. */
  export const FIXTURE_THEMES: ReadonlyArray<Theme>;
}
