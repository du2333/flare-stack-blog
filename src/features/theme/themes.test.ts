import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, THEME_IDS } from "./theme-ids";
import { DEFAULT_THEME_RECIPE, type ThemeRecipe } from "./theme-recipe";
import { resolveThemeOptions, selectTheme, THEMES } from "./themes";
import { themeThumbnail } from "./thumbnails/theme-thumbnail";
import { documentThemeId } from "./utils/document-theme";

const ROOT = join(import.meta.dirname, "../../..");
const WITH_FIXTURE = [...THEMES, fixtureTheme];

/**
 * The values of each Theme Recipe item, read from the `ThemeRecipe` type
 * itself, so a value added there is checked without a second list to keep.
 * Each item is written as a union of string literals.
 */
function recipeValues(): Record<string, Array<string>> {
  const source = readFileSync(
    join(import.meta.dirname, "theme-recipe.ts"),
    "utf8",
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const body = source.match(/interface ThemeRecipe\s*\{([^}]*)\}/)?.[1];
  expect(body, "the ThemeRecipe interface").toBeDefined();
  return Object.fromEntries(
    [...body!.matchAll(/(\w+)\??\s*:\s*([^;]+);/g)].map(([, item, type]) => {
      const values = type!
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      for (const value of values) {
        expect(value, `ThemeRecipe.${item} as a string literal`).toMatch(
          /^"[^"]+"$/,
        );
      }
      return [item!, values.map((value) => value.slice(1, -1))];
    }),
  );
}

describe("the Theme registry", () => {
  it("registers exactly the ids Site Config accepts, the default first", () => {
    expect(THEMES.map((theme) => theme.id)).toEqual([...THEME_IDS]);
    expect(THEMES[0]!.id).toBe(DEFAULT_THEME_ID);
  });

  it("keeps the fixture Theme out of a normal build", () => {
    // So Site Config reads a stored fixture id as the default
    // (config.resolve.test.ts covers ids a build does not offer).
    expect(THEME_IDS as ReadonlyArray<string>).not.toContain(fixtureTheme.id);
    expect(THEMES).not.toContain(fixtureTheme);
  });

  it.each(THEMES.map((theme) => [theme.id, theme] as const))(
    "draws a thumbnail for %s, so the picker never shows the placeholder",
    (_id, theme) => {
      expect(themeThumbnail(theme)).toBeDefined();
    },
  );

  it("keeps the thumbnails out of the registry, which every public page loads", () => {
    const registry = readFileSync(
      join(import.meta.dirname, "themes.ts"),
      "utf8",
    );
    expect(registry).not.toMatch(/from "\.\/thumbnails\//);
  });

  it("uses every value of every Theme Recipe item in some Theme", () => {
    const values = recipeValues();
    expect(Object.keys(values).sort()).toEqual(
      Object.keys(DEFAULT_THEME_RECIPE).sort(),
    );
    for (const [item, choices] of Object.entries(values)) {
      const used = new Set<string>(
        THEMES.map((theme) => theme.recipe[item as keyof ThemeRecipe]),
      );
      expect(
        choices.filter((value) => !used.has(value)),
        `values of ${item} no registered Theme uses`,
      ).toEqual([]);
    }
  });

  it("lists Posts as cards in classic, rows in namecard and tiles in immersive and sidebar", () => {
    expect(
      Object.fromEntries(
        THEMES.map((theme) => [theme.id, theme.recipe.postCard]),
      ),
    ).toEqual({
      classic: "card",
      namecard: "row",
      immersive: "tile",
      sidebar: "tile",
    });
  });

  it("closes the page with a caption in classic, a signature in namecard, a band in immersive and a colophon in sidebar", () => {
    expect(
      Object.fromEntries(
        THEMES.map((theme) => [theme.id, theme.recipe.footer]),
      ),
    ).toEqual({
      classic: "caption",
      namecard: "signature",
      immersive: "band",
      sidebar: "colophon",
    });
  });

  it.each(WITH_FIXTURE.map((theme) => [theme.id, theme] as const))(
    "gives %s a name, its own shell, a stylesheet and option defaults",
    (id, theme) => {
      expect(theme.name()).not.toBe("");
      expect(theme.shell.id).toBe(id);
      expect(theme.stylesheet).toMatch(/\.css$/);
      expect(() => theme.options.parse({})).not.toThrow();
    },
  );
});

describe("selectTheme", () => {
  it("picks the Theme with the id", () => {
    expect(selectTheme("fixture", WITH_FIXTURE)).toBe(fixtureTheme);
    expect(selectTheme("classic", WITH_FIXTURE).id).toBe("classic");
  });

  it("falls back to the default Theme for an id nobody registered", () => {
    expect(selectTheme("gone").id).toBe(DEFAULT_THEME_ID);
    expect(selectTheme("fixture").id).toBe(DEFAULT_THEME_ID);
  });
});

describe("resolveThemeOptions", () => {
  it("fills in the defaults and replaces invalid values", () => {
    expect(resolveThemeOptions(fixtureTheme, undefined)).toEqual({
      marker: "on",
    });
    expect(resolveThemeOptions(fixtureTheme, { marker: "off" })).toEqual({
      marker: "off",
    });
    expect(
      resolveThemeOptions(fixtureTheme, { marker: "yes", stale: 1 }),
    ).toEqual({ marker: "on" });
  });
});

describe("documentThemeId", () => {
  const PUBLIC = ["__root__", "/_public", "/_public/"];

  it("names the selected Theme on a public page", () => {
    expect(documentThemeId(PUBLIC, "classic")).toBe("classic");
    expect(documentThemeId(PUBLIC, "gone")).toBe(DEFAULT_THEME_ID);
  });

  it("is absent on the Admin and on a root error", () => {
    expect(
      documentThemeId(["__root__", "/admin", "/admin/"], "classic"),
    ).toBeUndefined();
    expect(documentThemeId(["__root__"], "classic")).toBeUndefined();
    expect(documentThemeId(PUBLIC, undefined)).toBeUndefined();
  });
});

/** What every Theme's stylesheet sets for the shared components to read. */
const SHELL_POSITIONS = [
  "--shell-floating-actions-left",
  "--shell-toc-side",
  "--shell-toc-compact",
  "--shell-toc-top",
  "--shell-toc-left",
  "--shell-toc-width",
];
/** The values the table of contents takes as its `display`. */
const SHELL_DISPLAYS = {
  "--shell-toc-side": ["block", "none"],
  "--shell-toc-compact": ["flex", "none"],
};

/** A stylesheet's source with every relative @import inlined. */
function source(path: string): string {
  return readFileSync(path, "utf8").replace(
    /@import\s+"(\.[^"]+)";/g,
    (_, imported: string) => source(join(dirname(path), imported)),
  );
}

describe.each(WITH_FIXTURE.map((theme) => [theme.id, theme] as const))(
  "the %s stylesheet",
  (id, theme) => {
    const css = source(join(ROOT, theme.stylesheet)).replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
      ([, selector, body]) => ({ selector: selector!.trim(), body: body! }),
    );

    it("sets design variables and shell positions on its own root only", () => {
      const scoped = `:root[data-theme="${id}"]`;
      for (const { selector, body } of rules) {
        if (/--(theme|shell)-[a-z0-9-]+\s*:/.test(body)) {
          expect(selector, body).toBe(scoped);
        }
      }
      expect(css).not.toMatch(/(^|[\s,}]):root\s*\{/);
    });

    it("never sets a base variable or an !important one", () => {
      expect(css).not.toMatch(/--fuwari-[a-z0-9-]+\s*:/);
      expect(css).not.toMatch(/--[a-z0-9-]+\s*:[^;{}]*!important/);
    });

    it("places what renders outside the shell (theme-shell.ts)", () => {
      for (const name of SHELL_POSITIONS) {
        expect(css, name).toMatch(new RegExp(`${name}\\s*:`));
      }
      for (const [name, allowed] of Object.entries(SHELL_DISPLAYS)) {
        for (const [, value] of css.matchAll(
          new RegExp(`${name}\\s*:([^;}]*)`, "g"),
        )) {
          expect(allowed, `${name}: ${value}`).toContain(value!.trim());
        }
      }
    });
  },
);
