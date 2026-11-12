import { expect, it } from "vitest";
import { previewFrameLayout } from "./preview-geometry";

it("scales a desktop frame to the width of the space and makes it as tall as the space", () => {
  const layout = previewFrameLayout("desktop", { width: 640, height: 800 });
  expect(layout.scale).toBe(0.5);
  expect(layout.frame).toEqual({ width: 1280, height: 1600 });
  expect(layout.canvas).toEqual({ width: 640, height: 800 });
});

it("keeps a phone frame at its natural size where it fits, full height and in the middle", () => {
  const layout = previewFrameLayout("phone", { width: 600, height: 900 });
  expect(layout.scale).toBe(1);
  expect(layout.frame).toEqual({ width: 390, height: 900 });
  expect(layout.canvas).toEqual({ width: 390, height: 900 });
});

it("scales a phone frame down only for a space narrower or shorter than a phone", () => {
  const narrow = previewFrameLayout("phone", { width: 195, height: 2000 });
  expect(narrow.scale).toBe(0.5);
  expect(narrow.canvas.width).toBe(195);
  expect(narrow.frame.height).toBe(4000);

  const short = previewFrameLayout("phone", { width: 800, height: 422 });
  expect(short.scale).toBe(0.5);
  expect(short.frame.height).toBe(844);
});

it("has no scale before the space is measured", () => {
  expect(previewFrameLayout("desktop", { width: 0, height: 0 }).scale).toBe(0);
});
