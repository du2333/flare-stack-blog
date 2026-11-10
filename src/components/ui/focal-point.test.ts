import { expect, it } from "vitest";
import {
  FOCAL_POINT_CENTRE,
  focalObjectPosition,
  focalPointFromPointer,
  isFocalPointCentred,
  moveFocalPoint,
} from "./focal-point";

const rect = { left: 100, top: 50, width: 400, height: 200 };

it("turns a pointer position into whole percents of the box", () => {
  expect(focalPointFromPointer(rect, 300, 150)).toEqual({ x: 50, y: 50 });
  expect(focalPointFromPointer(rect, 100, 50)).toEqual({ x: 0, y: 0 });
  expect(focalPointFromPointer(rect, 500, 250)).toEqual({ x: 100, y: 100 });
  // 133 / 400 = 33.25, 70 / 200 = 35
  expect(focalPointFromPointer(rect, 233, 120)).toEqual({ x: 33, y: 35 });
});

it("keeps a pointer outside the box inside 0 to 100", () => {
  expect(focalPointFromPointer(rect, 0, 900)).toEqual({ x: 0, y: 100 });
  expect(focalPointFromPointer(rect, 9000, -40)).toEqual({ x: 100, y: 0 });
});

it("reads a box without size as the centre", () => {
  expect(
    focalPointFromPointer({ left: 0, top: 0, width: 0, height: 0 }, 5, 5),
  ).toEqual(FOCAL_POINT_CENTRE);
});

it("moves by 1 with an arrow key and by 10 with Shift", () => {
  const point = { x: 50, y: 50 };
  expect(moveFocalPoint(point, "ArrowLeft")).toEqual({ x: 49, y: 50 });
  expect(moveFocalPoint(point, "ArrowRight")).toEqual({ x: 51, y: 50 });
  expect(moveFocalPoint(point, "ArrowUp")).toEqual({ x: 50, y: 49 });
  expect(moveFocalPoint(point, "ArrowDown")).toEqual({ x: 50, y: 51 });
  expect(moveFocalPoint(point, "ArrowRight", true)).toEqual({ x: 60, y: 50 });
  expect(moveFocalPoint(point, "ArrowUp", true)).toEqual({ x: 50, y: 40 });
});

it("stops at the edges", () => {
  expect(moveFocalPoint({ x: 0, y: 3 }, "ArrowLeft", true)).toEqual({
    x: 0,
    y: 3,
  });
  expect(moveFocalPoint({ x: 97, y: 100 }, "ArrowDown", true)).toEqual({
    x: 97,
    y: 100,
  });
  expect(moveFocalPoint({ x: 97, y: 4 }, "ArrowRight", true)).toEqual({
    x: 100,
    y: 4,
  });
});

it("leaves other keys alone", () => {
  expect(moveFocalPoint({ x: 50, y: 50 }, "Enter")).toBeNull();
  expect(moveFocalPoint({ x: 50, y: 50 }, "a", true)).toBeNull();
});

it("knows the centre and writes an object-position", () => {
  expect(isFocalPointCentred({ x: 50, y: 50 })).toBe(true);
  expect(isFocalPointCentred({ x: 50, y: 51 })).toBe(false);
  expect(focalObjectPosition({ x: 12, y: 80 })).toBe("12% 80%");
});
