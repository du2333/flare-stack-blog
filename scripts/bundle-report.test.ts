import { describe, expect, it } from "vitest";
import { overBudget } from "./bundle-report";

const kb = (n: number) => n * 1024;
const page = (js: number, css: number) => ({
  js: { br: kb(js) },
  css: { br: kb(css) },
});

describe("overBudget", () => {
  it("passes a page at or under both budgets", () => {
    expect(
      overBudget(
        { home: page(100, 10), post: page(120, 12) },
        { home: { js: 100, css: 10 }, post: { js: 130, css: 12 } },
      ),
    ).toEqual([]);
  });

  it("names the page, the kind of file and the size that is over", () => {
    expect(
      overBudget(
        { home: page(101, 5), post: page(50, 13) },
        { home: { js: 100, css: 10 }, post: { js: 130, css: 12 } },
      ),
    ).toEqual([
      { page: "home", kind: "js", kb: 101, budget: 100 },
      { page: "post", kind: "css", kb: 13, budget: 12 },
    ]);
  });

  it("reports a page that has no budget", () => {
    expect(overBudget({ moments: page(1, 1) }, {})).toEqual([
      { page: "moments", kind: "js", kb: 1, budget: undefined },
      { page: "moments", kind: "css", kb: 1, budget: undefined },
    ]);
  });
});
