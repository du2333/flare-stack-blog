import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, THEME_IDS } from "./theme-ids";
import { resolveThemeOptions, selectTheme, THEMES } from "./themes";
import { documentThemeId } from "./utils/document-theme";

const ROOT = join(import.meta.dirname, "../../..");
const WITH_FIXTURE = [...THEMES, fixtureTheme];

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
      marker: true,
    });
    expect(resolveThemeOptions(fixtureTheme, { marker: false })).toEqual({
      marker: false,
    });
    expect(
      resolveThemeOptions(fixtureTheme, { marker: "yes", stale: 1 }),
    ).toEqual({ marker: true });
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
  },
);
