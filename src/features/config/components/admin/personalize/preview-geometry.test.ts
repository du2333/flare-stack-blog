import { expect, it } from "vitest";
import { PREVIEW_FRAME_SIZE, previewScale } from "./preview-geometry";

it("scales a desktop frame down to the width it is given", () => {
  expect(previewScale("desktop", { width: 640, maxHeight: 2000 })).toBe(0.5);
});

it("never scales a desktop frame past the height it is given", () => {
  expect(previewScale("desktop", { width: 1280, maxHeight: 400 })).toBe(0.5);
});

it("keeps a phone frame at its natural size where it fits", () => {
  expect(previewScale("phone", { width: 800, maxHeight: 2000 })).toBe(1);
});

it("shrinks a phone frame to the width or the height of the space", () => {
  const { width, height } = PREVIEW_FRAME_SIZE.phone;
  expect(previewScale("phone", { width: width / 2, maxHeight: 5000 })).toBe(
    0.5,
  );
  expect(previewScale("phone", { width: 5000, maxHeight: height / 4 })).toBe(
    0.25,
  );
});

it("has no scale before the space is measured", () => {
  expect(previewScale("desktop", { width: 0, maxHeight: 0 })).toBe(0);
});
