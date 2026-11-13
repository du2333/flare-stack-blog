import { expect, it } from "vitest";
import { PREVIEW_VIEWPORT, previewFrameLayout } from "./preview-geometry";

it("renders the phone in a true 390 x 844 viewport, whatever the space", () => {
  expect(PREVIEW_VIEWPORT.phone).toEqual({ width: 390, height: 844 });
  for (const space of [
    { width: 700, height: 700 },
    { width: 3000, height: 3000 },
    { width: 0, height: 0 },
  ]) {
    expect(previewFrameLayout("phone", space).frame).toEqual(
      PREVIEW_VIEWPORT.phone,
    );
  }
});

it("renders the desktop 1280 wide and at least 800 tall", () => {
  expect(PREVIEW_VIEWPORT.desktop).toEqual({ width: 1280, height: 800 });
  expect(previewFrameLayout("desktop", { width: 0, height: 0 }).frame).toEqual(
    PREVIEW_VIEWPORT.desktop,
  );
  expect(
    previewFrameLayout("desktop", { width: 640, height: 400 }).frame,
  ).toEqual({ width: 1280, height: 800 });
});

it("fills a taller space with a taller desktop viewport, at the scale of its width", () => {
  const tall = previewFrameLayout("desktop", { width: 640, height: 700 });
  expect(tall.scale).toBe(0.5);
  expect(tall.frame).toEqual({ width: 1280, height: 1400 });
  expect(tall.canvas).toEqual({ width: 640, height: 700 });
});

it("shrinks the desktop frame by its height only in a space too short for 800", () => {
  const short = previewFrameLayout("desktop", { width: 2560, height: 400 });
  expect(short.scale).toBe(0.5);
  expect(short.frame).toEqual({ width: 1280, height: 800 });
  expect(short.canvas).toEqual({ width: 640, height: 400 });
});

it("keeps a phone frame at its natural size where it fits", () => {
  const layout = previewFrameLayout("phone", { width: 700, height: 900 });
  expect(layout.scale).toBe(1);
  expect(layout.canvas).toEqual({ width: 390, height: 844 });
});

it("scales a phone frame down only for a space narrower or shorter than a phone", () => {
  expect(previewFrameLayout("phone", { width: 195, height: 2000 }).scale).toBe(
    0.5,
  );
  expect(previewFrameLayout("phone", { width: 800, height: 422 }).scale).toBe(
    0.5,
  );
});

it("has no scale before the space is measured", () => {
  const layout = previewFrameLayout("desktop", { width: 0, height: 0 });
  expect(layout.scale).toBe(0);
  expect(layout.canvas).toEqual({ width: 0, height: 0 });
});
