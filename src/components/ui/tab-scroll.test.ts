import { expect, it } from "vitest";
import { centeredScrollLeft, scrollEdges } from "./tab-scroll";

it("reports no edges for a row that fits", () => {
  expect(
    scrollEdges({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 }),
  ).toEqual({ start: false, end: false });
});

it("reports the hidden end of a row scrolled to its start", () => {
  expect(
    scrollEdges({ scrollLeft: 0, scrollWidth: 500, clientWidth: 300 }),
  ).toEqual({ start: false, end: true });
});

it("reports both ends of a row scrolled to the middle", () => {
  expect(
    scrollEdges({ scrollLeft: 80, scrollWidth: 500, clientWidth: 300 }),
  ).toEqual({ start: true, end: true });
});

it("ignores sub-pixel remainders at the end of a row", () => {
  expect(
    scrollEdges({ scrollLeft: 199.5, scrollWidth: 500, clientWidth: 300 }),
  ).toEqual({ start: true, end: false });
});

it("centers a tab and stays inside the row", () => {
  const row = { scrollWidth: 600, clientWidth: 300 };
  expect(centeredScrollLeft(row, { offsetLeft: 250, offsetWidth: 100 })).toBe(
    150,
  );
  expect(centeredScrollLeft(row, { offsetLeft: 10, offsetWidth: 60 })).toBe(0);
  expect(centeredScrollLeft(row, { offsetLeft: 540, offsetWidth: 60 })).toBe(
    300,
  );
});
