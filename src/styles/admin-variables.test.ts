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
    // A light value that only reads --admin-* names follows the dark ones.
    const followsScheme = (name: string, seen = new Set<string>()): boolean => {
      if (adminDark.has(name)) return true;
      if (seen.has(name)) return false;
      seen.add(name);
      const refs = [
        ...(adminLight.get(name) ?? "").matchAll(/var\(\s*(--[a-z0-9-]+)/g),
      ].map((match) => match[1]);
      return (
        refs.length > 0 &&
        refs.every(
          (ref) => ref.startsWith("--admin-") && followsScheme(ref, seen),
        )
      );
    };
    const missing = [...adminLight.keys()].filter(
      (name) => darkBase.has(name) && !followsScheme(name),
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

  describe("The colours (spec #304) and the contrast WCAG asks for", () => {
    const values = {
      light: adminLight,
      dark: new Map([...adminLight, ...adminDark]),
    };
    /** A name's value with its var() chain followed, in one scheme. */
    const resolve = (scheme: "light" | "dark", name: string): string => {
      const value = values[scheme].get(name);
      expect(value, name).toBeDefined();
      const ref = /^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(value!);
      return ref ? resolve(scheme, ref[1]) : value!;
    };
    type Rgb = [number, number, number];
    const rgb = (value: string): { color: Rgb; alpha: number } => {
      const hex = /^#([0-9a-f]{6})$/i.exec(value);
      if (hex)
        return {
          color: [0, 2, 4].map((i) =>
            parseInt(hex[1].slice(i, i + 2), 16),
          ) as Rgb,
          alpha: 1,
        };
      const fn = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/.exec(value);
      expect(fn, `${value} is #rrggbb or rgb()`).not.toBeNull();
      return {
        color: [Number(fn![1]), Number(fn![2]), Number(fn![3])],
        alpha: fn![4] === undefined ? 1 : Number(fn![4]),
      };
    };
    const luminance = ([r, g, b]: Rgb) => {
      const [lr, lg, lb] = [r, g, b].map((c) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    };
    /** `fg` over the opaque `bg`, both names of the scheme. */
    const contrast = (scheme: "light" | "dark", fg: string, bg: string) => {
      const back = rgb(resolve(scheme, bg));
      expect(back.alpha, `${bg} is opaque`).toBe(1);
      const front = rgb(resolve(scheme, fg));
      const mixed = front.color.map(
        (c, i) => c * front.alpha + back.color[i] * (1 - front.alpha),
      ) as Rgb;
      const [light, dark] = [luminance(mixed), luminance(back.color)].sort(
        (x, y) => y - x,
      );
      return (light + 0.05) / (dark + 0.05);
    };

    it("is ink for the primary action and flame for the accent", () => {
      expect(values.light.get("--fuwari-primary")).toBe("var(--admin-ink)");
      expect(values.light.get("--admin-on-accent")).toBe("var(--admin-on-ink)");
      expect(resolve("light", "--admin-accent")).toBe("#ea580c");
      expect(resolve("dark", "--admin-accent")).toBe("#ff8a4c");
    });

    const SURFACES = ["--admin-surface", "--admin-canvas"];
    for (const scheme of ["light", "dark"] as const) {
      it(`${scheme}: text, secondary text and the accent's text read at 4.5:1`, () => {
        for (const surface of SURFACES) {
          for (const text of [
            "--admin-fg",
            "--admin-fg-2",
            "--admin-fg-3",
            "--admin-ink",
            "--admin-accent-text",
          ])
            expect(
              contrast(scheme, text, surface),
              `${text} on ${surface}`,
            ).toBeGreaterThan(4.5);
        }
      });

      it(`${scheme}: text on the ink button reads at 4.5:1, hovered and pressed too`, () => {
        for (const fill of [
          "--admin-ink",
          "--fuwari-primary-hover",
          "--fuwari-primary-active",
        ])
          expect(
            contrast(scheme, "--admin-on-ink", fill),
            fill,
          ).toBeGreaterThan(4.5);
      });

      it(`${scheme}: the focus ring (the accent) stands out from a card and the canvas at 3:1`, () => {
        for (const surface of SURFACES)
          expect(
            contrast(scheme, "--admin-accent", surface),
            surface,
          ).toBeGreaterThan(3);
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
