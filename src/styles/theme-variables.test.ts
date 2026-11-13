// A static guard: jsdom resolves neither var() nor cascade layers nor
// !important on custom properties, so the Admin isolation is checked on the
// stylesheet itself, against the cascade rule it relies on: an !important
// declaration beats every normal one, whatever its layer, selector or order.
// What the Admin's own --fuwari-* values are, and that none derives from the
// site hue, is admin-variables.test.ts.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..");
const SHEET = join(import.meta.dirname, "theme-variables.css");
const THEME_VARIABLE = /--theme-[a-z0-9-]+/g;

interface Declaration {
  name: string;
  value: string;
  important: boolean;
}

function block(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): Declaration => {
      const colon = part.indexOf(":");
      const raw = part.slice(colon + 1).trim();
      const important = raw.endsWith("!important");
      return {
        name: part.slice(0, colon).trim(),
        value: important ? raw.slice(0, -"!important".length).trim() : raw,
        important,
      };
    });
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

const sheet = readFileSync(SHEET, "utf8");
const defaults = block(sheet, ":root");
const pin = block(sheet, ":root:has(.admin-layout)");
const pinned = new Map(
  pin.map((declaration) => [declaration.name, declaration]),
);
const others = sourceFiles(SRC).filter((path) => path !== SHEET);

/** The declaration that wins on one element, by importance, then order. */
function winner(declarations: Array<Declaration>) {
  const important = declarations.filter((declaration) => declaration.important);
  return (important.length ? important : declarations).at(-1);
}

describe("Theme variables", () => {
  it("are all pinned to their default under the Admin", () => {
    for (const declaration of pin) {
      expect(declaration.important, declaration.name).toBe(true);
    }
    for (const { name, value } of defaults) {
      expect(pinned.get(name)?.value, name).toBe(value);
    }
    const undeclared = pin.filter(
      ({ name }) => !defaults.some((declaration) => declaration.name === name),
    );
    for (const { name, value } of undeclared) {
      expect(value, name).toBe("initial");
    }
  });

  it("never name the site hue themselves, so a pinned one follows the Admin's values", () => {
    for (const { name, value } of [...defaults, ...pin]) {
      expect(value, name).not.toContain("--fuwari-hue");
    }
  });

  it("are pinned wherever the code reads one, and read wherever pinned", () => {
    const read = new Set(
      others.flatMap(
        (path) => readFileSync(path, "utf8").match(THEME_VARIABLE) ?? [],
      ),
    );
    expect(
      [...read].filter((name) => !pinned.has(name)),
      "read, not pinned",
    ).toEqual([]);
    expect(
      [...pinned.keys()].filter((name) => !read.has(name)),
      "pinned, never read",
    ).toEqual([]);
  });

  it("keep their default on the Admin when a Theme sets an extreme value on the public root", () => {
    for (const { name } of pin) {
      const theme: Declaration = { name, value: "999rem", important: false };
      const fallback = defaults.find(
        (declaration) => declaration.name === name,
      );
      // Source order puts a Theme's stylesheet after this one.
      const onAdminRoot = [
        ...(fallback ? [fallback] : []),
        pinned.get(name)!,
        theme,
      ];
      expect(winner(onAdminRoot)?.value, name).toBe(
        fallback?.value ?? "initial",
      );
    }
  });

  it("have no other !important declaration that could beat the pin", () => {
    const offenders = others.flatMap((path) =>
      [
        ...readFileSync(path, "utf8").matchAll(
          /(--theme-[a-z0-9-]+)\s*:[^;{}]*!important/g,
        ),
      ].map((match) => `${relative(SRC, path)}: ${match[1]}`),
    );
    expect(offenders).toEqual([]);
  });

  it("pin on the element the Admin workbench renders", () => {
    const adminRoute = readFileSync(
      join(SRC, "routes/admin/route.tsx"),
      "utf8",
    );
    expect(adminRoute).toMatch(/className=[^>]*\badmin-layout\b/);
  });
});
