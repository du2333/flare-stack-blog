import { expect, it } from "vitest";
import { PREVIEW_VIEWPORT, previewFrameLayout } from "./preview-geometry";

it("renders the desktop in a true 1440 x 900 viewport and the phone in 390 x 844", () => {
  expect(PREVIEW_VIEWPORT.desktop).toEqual({ width: 1440, height: 900 });
  expect(PREVIEW_VIEWPORT.phone).toEqual({ width: 390, height: 844 });
  for (const device of ["desktop", "phone"] as const) {
    for (const space of [
      { width: 700, height: 700 },
      { width: 3000, height: 3000 },
      { width: 0, height: 0 },
    ]) {
      expect(previewFrameLayout(device, space).frame).toEqual(
        PREVIEW_VIEWPORT[device],
      );
    }
  }
});

it("scales the desktop frame by the tighter of the width and the height of the space", () => {
  const wide = previewFrameLayout("desktop", { width: 720, height: 900 });
  expect(wide.scale).toBe(0.5);
  expect(wide.canvas).toEqual({ width: 720, height: 450 });

  const short = previewFrameLayout("desktop", { width: 2880, height: 450 });
  expect(short.scale).toBe(0.5);
  expect(short.canvas).toEqual({ width: 720, height: 450 });
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
