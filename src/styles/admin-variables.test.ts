// A static guard: nothing the Admin workbench reads resolves from the Site
// Config hue (ADR 0021, amended 2026-11-11). jsdom resolves neither var() nor
// the cascade, so this works on the stylesheets themselves.
//
// It covers every custom property declared in the root blocks of styles.css,
// admin-variables.css and theme-variables.css: each is resolved the way the
// cascade orders those blocks on the Admin's root element (the base layer,
// the dark base, the Admin's light values, the Admin's dark values, the pin),
// following var() chains and fallbacks, and none may reach --fuwari-hue. It
// also requires every other stylesheet that reads the hue to be a public-only
// Theme Shell or to carry an Admin override.
//
// It cannot see a colour written as a literal in a component, a variable set
// at runtime (the hue itself is set on <html> inline), a rule whose selector
// is not one of those root blocks, or the specificity of selectors other than
// the ones it models. The screenshots and the hue-drag check cover those.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..");
const HUE = "--fuwari-hue";

function read(path: string) {
  return readFileSync(join(SRC, path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

/** The declarations of the first rule that opens with `selector {`. */
function block(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (; end < css.length; end += 1) {
    if (css[end] === "{") depth += 1;
    if (css[end] === "}" && (depth -= 1) === 0) break;
  }
  return new Map(
    css
      .slice(open + 1, end)
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.startsWith("--"))
      .map((part): [string, string] => {
        const colon = part.indexOf(":");
        return [
          part.slice(0, colon).trim(),
          part
            .slice(colon + 1)
            .replace(/!important$/, "")
            .trim(),
        ];
      }),
  );
}

function sourceFiles(dir: string): Array<string> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(css|tsx?)$/.test(entry.name) && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

const styles = read("styles.css");
const admin = read("styles/admin-variables.css");
const themes = read("styles/theme-variables.css");

const base = block(styles, "  :root");
const darkBase = block(styles, "  .dark");
const adminLight = block(admin, ":root:has(.admin-layout)");
const adminDark = block(admin, ":root.dark:has(.admin-layout)");
const themeDefaults = block(themes, ":root");
const pin = block(themes, ":root:has(.admin-layout)");

/** What each name is on the Admin's root, in cascade order, for one scheme. */
function onAdminRoot(scheme: "light" | "dark") {
  return new Map([
    ...base,
    ...themeDefaults,
    ...(scheme === "dark" ? darkBase : []),
    ...adminLight,
    ...(scheme === "dark" ? adminDark : []),
    ...pin,
  ]);
}

/** The first variable on the chain from `name` that is the hue, if any. */
function reachesHue(
  name: string,
  values: Map<string, string>,
  seen = new Set<string>(),
): boolean {
  if (name === HUE) return true;
  if (seen.has(name)) return false;
  seen.add(name);
  const value = values.get(name) ?? "";
  return [...value.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].some((match) =>
    reachesHue(match[1], values, seen),
  );
}

describe("The Admin's variables", () => {
  for (const scheme of ["light", "dark"] as const) {
    it(`none resolves from the site hue, ${scheme}`, () => {
      const values = onAdminRoot(scheme);
      const offenders = [...values.keys()].filter(
        (name) => name !== HUE && reachesHue(name, values),
      );
      expect(offenders).toEqual([]);
    });
  }

  it("the Admin's dark values replace every one the dark base layer sets", () => {
    const missing = [...adminLight.keys()].filter(
      (name) => darkBase.has(name) && !adminDark.has(name),
    );
    expect(missing).toEqual([]);
  });

  it("nothing the code reads is left to derive from the hue", () => {
    // A name that is declared nowhere is read with a fallback; the ones in the
    // root blocks were checked above, in both schemes.
    const read = new Set(
      sourceFiles(SRC).flatMap((path) =>
        [
          ...readFileSync(path, "utf8").matchAll(
            /(?:var\(\s*|\(\s*)(--(?:fuwari|theme|admin|radius)-[a-z0-9-]+)/g,
          ),
        ].map((match) => match[1]),
      ),
    );
    for (const scheme of ["light", "dark"] as const) {
      const values = onAdminRoot(scheme);
      const offenders = [...read].filter(
        (name) => name !== HUE && values.has(name) && reachesHue(name, values),
      );
      expect(offenders, scheme).toEqual([]);
    }
  });

  it("the stylesheets that read the hue are public Theme Shells or override it for the Admin", () => {
    const readers = sourceFiles(SRC)
      .map((path) => relative(SRC, path))
      .filter(
        (path) =>
          path !== "styles.css" &&
          readFileSync(join(SRC, path), "utf8").includes(`var(${HUE}`),
      )
      .filter((path) => !path.startsWith("features/theme/shells/"));
    // The lightbox is shared with public pages; its Admin override has no hue.
    expect(readers).toEqual([
      "features/posts/components/content/photo-swipe.css",
    ]);
    const lightbox = read("features/posts/components/content/photo-swipe.css");
    const override = block(lightbox, ":root:has(.admin-layout) .pswp");
    const own = block(lightbox, ".pswp");
    expect([...override.keys()].sort()).toEqual([...own.keys()].sort());
    for (const value of override.values()) expect(value).not.toContain("var(");
  });

  describe("The ink accent (spec #298) has the contrast WCAG asks for", () => {
    const hex = (value: string | undefined) => {
      expect(value, "a #rrggbb value").toMatch(/^#[0-9a-f]{6}$/i);
      return [1, 3, 5].map((i) => parseInt(value!.slice(i, i + 2), 16) / 255);
    };
    const luminance = (value: string | undefined) => {
      const [r, g, b] = hex(value).map((c) =>
        c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string | undefined, b: string | undefined) => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (light + 0.05) / (dark + 0.05);
    };
    const values = {
      light: adminLight,
      dark: new Map([...adminLight, ...adminDark]),
    };

    it("is ink: light #2b2722 under #fdfbf7, dark #ece6da under #1f1b17", () => {
      expect(values.light.get("--fuwari-primary")).toBe("#2b2722");
      expect(values.light.get("--admin-on-accent")).toBe("#fdfbf7");
      expect(values.dark.get("--fuwari-primary")).toBe("#ece6da");
      expect(values.dark.get("--admin-on-accent")).toBe("#1f1b17");
    });

    for (const scheme of ["light", "dark"] as const) {
      it(`${scheme}: button text, links and the focus ring`, () => {
        const v = values[scheme];
        const accent = v.get("--fuwari-primary");
        for (const fill of [
          accent,
          v.get("--fuwari-primary-hover"),
          v.get("--fuwari-primary-active"),
        ])
          expect(contrast(v.get("--admin-on-accent"), fill)).toBeGreaterThan(
            4.5,
          );
        for (const surface of ["--fuwari-card-bg", "--fuwari-page-bg"]) {
          // A link is the accent on a surface; so is a focus ring (3:1).
          expect(contrast(accent, v.get(surface)), surface).toBeGreaterThan(
            4.5,
          );
        }
      });
    }
  });

  it("are declared where the pin and the Admin's blocks meet, on one selector", () => {
    // The pin reads --fuwari-* on the element it is declared on, so the
    // Admin's values must be declared on that same element.
    expect(pin.size).toBeGreaterThan(0);
    expect(adminLight.size).toBeGreaterThan(0);
    expect(read("routes/admin/route.tsx")).toMatch(
      /className=[^>]*\badmin-layout\b/,
    );
  });
});
