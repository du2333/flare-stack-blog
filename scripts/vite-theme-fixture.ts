import path from "node:path";
import type { Plugin } from "vite";
import { FIXTURE_THEME_ID } from "../tests/theme-fixture/theme-id.ts";

export const FIXTURE_THEMES_MODULE_ID = "virtual:fixture-themes";
const RESOLVED_ID = `\0${FIXTURE_THEMES_MODULE_ID}`;

/**
 * The test fixture Theme (`tests/theme-fixture`) exists in a build only when
 * it is made with THEME_FIXTURE=1, which `scripts/check-theme-styles.ts`
 * does. Then `virtual:fixture-themes` exports it for the registry and
 * `__FIXTURE_THEME_IDS__` adds its id to the ids Site Config accepts. Every
 * other build, the dev server and the tests get neither, so a real
 * deployment can never select it; unit tests inject the fixture themselves.
 */
export function themeFixturePlugin(
  enabled = process.env.THEME_FIXTURE === "1",
): Plugin {
  let fixturePath = path.resolve("tests/theme-fixture/theme.ts");
  return {
    name: "theme-fixture",
    config: () => ({
      define: {
        __FIXTURE_THEME_IDS__: JSON.stringify(
          enabled ? [FIXTURE_THEME_ID] : [],
        ),
      },
    }),
    configResolved(config) {
      fixturePath = path.resolve(config.root, "tests/theme-fixture/theme.ts");
    },
    resolveId(id) {
      return id === FIXTURE_THEMES_MODULE_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      return enabled
        ? `import { fixtureTheme } from ${JSON.stringify(fixturePath)};\nexport const FIXTURE_THEMES = [fixtureTheme];`
        : "export const FIXTURE_THEMES = [];";
    },
  };
}
