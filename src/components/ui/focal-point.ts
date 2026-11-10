/** A point in an image, in whole percent from the left (x) and the top (y). */
export interface FocalPoint {
  x: number;
  y: number;
}

export const FOCAL_POINT_CENTRE: FocalPoint = { x: 50, y: 50 };

const MIN = 0;
const MAX = 100;
const STEP = 1;
const STEP_WITH_SHIFT = 10;

const ARROWS: Record<string, FocalPoint> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

function clampPercent(value: number) {
  return Math.min(MAX, Math.max(MIN, Math.round(value)));
}

/** Where a pointer at (clientX, clientY) lands in `rect`, as whole percents. */
export function focalPointFromPointer(
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  clientX: number,
  clientY: number,
): FocalPoint {
  if (rect.width <= 0 || rect.height <= 0) return { ...FOCAL_POINT_CENTRE };
  return {
    x: clampPercent(((clientX - rect.left) / rect.width) * 100),
    y: clampPercent(((clientY - rect.top) / rect.height) * 100),
  };
}

/**
 * The point an arrow key moves `point` to: by 1, or by 10 with Shift. Null for
 * any other key, so the caller leaves it alone.
 */
export function moveFocalPoint(
  point: FocalPoint,
  key: string,
  shiftKey = false,
): FocalPoint | null {
  const direction = ARROWS[key];
  if (!direction) return null;
  const step = shiftKey ? STEP_WITH_SHIFT : STEP;
  return {
    x: clampPercent(point.x + direction.x * step),
    y: clampPercent(point.y + direction.y * step),
  };
}

export function isFocalPointCentred(point: FocalPoint) {
  return point.x === FOCAL_POINT_CENTRE.x && point.y === FOCAL_POINT_CENTRE.y;
}

/** The `object-position` that keeps `point` in view when an image is cropped. */
export function focalObjectPosition(point: FocalPoint) {
  return `${point.x}% ${point.y}%`;
}
