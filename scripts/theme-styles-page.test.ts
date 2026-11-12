import { describe, expect, it } from "vitest";
import { contrastingHue, readRenderedPage } from "./theme-styles-page";

describe("readRenderedPage", () => {
  it("reads the Theme, the hue and the stylesheets of a rendered page", () => {
    const page = readRenderedPage(
      `<!DOCTYPE html><html lang="zh" data-theme="namecard" style="--fuwari-hue:120"><head>` +
        `<link rel="stylesheet" href="/assets/styles.css"/>` +
        `<link rel="icon" href="/favicon.svg"/>` +
        `<link rel="stylesheet" href="/assets/namecard.css"/></head></html>`,
    );
    expect(page).toEqual({
      dataTheme: "namecard",
      hue: "120",
      stylesheetHrefs: ["/assets/styles.css", "/assets/namecard.css"],
    });
  });

  it("reads none where the Admin page sets neither", () => {
    expect(readRenderedPage(`<html lang="zh"><head></head></html>`)).toEqual({
      dataTheme: undefined,
      hue: undefined,
      stylesheetHrefs: [],
    });
  });
});

describe("contrastingHue", () => {
  it("stays in range and away from the saved hue", () => {
    expect(contrastingHue(250)).toBe(70);
    expect(contrastingHue(0)).toBe(180);
    expect(contrastingHue(360)).toBe(180);
  });
});
