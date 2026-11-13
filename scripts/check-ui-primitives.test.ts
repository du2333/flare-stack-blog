import { describe, expect, it } from "vitest";
import { compareToBaseline, countRawControls } from "./check-ui-primitives.ts";

describe("countRawControls", () => {
  it("counts raw elements, not components, strings or comments", () => {
    const text = `
      // <button> in a comment
      const label = "<input>";
      export const A = () => (
        <div>
          <button type="button">x</button>
          <input />
          <Button>y</Button>
          <Input />
          <textarea></textarea>
          <select />
        </div>
      );
    `;
    expect(countRawControls("a.tsx", text)).toBe(4);
  });
});

describe("compareToBaseline", () => {
  const baseline = { "src/a.tsx": 2, "src/b.tsx": 1 };

  it("passes when nothing grew", () => {
    expect(
      compareToBaseline({ "src/a.tsx": 2, "src/b.tsx": 1 }, baseline),
    ).toEqual({
      violations: [],
      lowered: [],
    });
  });

  it("fails on growth and on a new file", () => {
    const result = compareToBaseline(
      { "src/a.tsx": 3, "src/b.tsx": 1, "src/c.tsx": 1 },
      baseline,
    );
    expect(result.violations).toHaveLength(2);
  });

  it("reports counts that went down or files that are clean now", () => {
    const result = compareToBaseline({ "src/a.tsx": 1 }, baseline);
    expect(result.violations).toEqual([]);
    expect(result.lowered).toEqual(["src/a.tsx: 2 -> 1", "src/b.tsx: 1 -> 0"]);
  });
});
