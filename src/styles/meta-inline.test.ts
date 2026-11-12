// A static guard: jsdom lays nothing out, so the inline meta row (Theme
// Recipe, meta: "inline") is checked on the stylesheet itself, against the
// arithmetic it relies on.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(import.meta.dirname, "..", "styles.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the block of `selector`, by property. */
function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries(
    body
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const colon = part.indexOf(":");
        return [part.slice(0, colon).trim(), part.slice(colon + 1).trim()];
      }),
  );
}

function rem(value: string) {
  expect(value).toMatch(/^-?[\d.]+rem$/);
  return Number.parseFloat(value);
}

describe("the inline meta row", () => {
  const row = block(".fuwari-meta-inline");
  const dot = block(".fuwari-meta-inline > :not(:first-child)::before");
  const room = block(".fuwari-meta-inline > :not(:last-child)::after");

  // An item that starts a line starts flush with the row: the dot before it
  // is no part of its width.
  it("hangs the dot before its item, where it takes no room", () => {
    expect(dot.content).toBe('"·"');
    expect(dot.width).toBe("0");
    expect(dot["justify-content"]).toBe("flex-end");
    const [before, after] = dot["margin-inline"]!.split(" ").map(rem);
    expect(before! + after!).toBe(0);
    expect(after).toBeGreaterThan(0);
  });

  // Two items on a line stand as far apart as a dot in the flow would set
  // them: the room of the dot and the space after it end the item before.
  it("keeps the room of the dot at the end of the item before it, unseen", () => {
    expect(room.content).toBe(dot.content);
    expect(room.visibility).toBe("hidden");
    expect(rem(room["margin-left"]!)).toBe(
      dot["margin-inline"]!.split(" ").map(rem)[1],
    );
  });

  // The row cuts off the dot of an item that starts a line, and not the
  // focus ring of a link there: it reaches past its items, by less than the
  // dot hangs out, and no further than it is pulled back.
  it("cuts off sideways short of the dot, with room for a focus ring", () => {
    expect(row["overflow-x"]).toBe("clip");
    const reach = rem(row["padding-inline"]!);
    expect(rem(row["margin-inline"]!)).toBe(-reach);
    expect(reach).toBeLessThan(dot["margin-inline"]!.split(" ").map(rem)[1]!);
    // An outline of 2px at an offset of 2px around a link padded by 0.25rem.
    expect(reach * 16).toBeGreaterThanOrEqual(4 + 2);
  });

  // A stacking context of its own would put the row over the link that
  // covers a tile, and the row's plain text would stop opening the Post.
  it("makes no stacking context, so a tile's link still covers its meta", () => {
    for (const property of ["clip-path", "position", "transform", "contain"]) {
      expect(row[property]).toBeUndefined();
    }
  });
});
