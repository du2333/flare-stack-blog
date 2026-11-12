export type PreviewDevice = "desktop" | "phone";

/** The width the public page is rendered at, before it is scaled to fit. */
export const PREVIEW_FRAME_WIDTH: Record<PreviewDevice, number> = {
  desktop: 1280,
  phone: 390,
};
/** How tall a phone is at its natural size; a shorter space scales it down. */
export const PHONE_NATURAL_HEIGHT = 844;

export interface PreviewFrameLayout {
  scale: number;
  /** The iframe's size in CSS pixels, before the scale. */
  frame: { width: number; height: number };
  /** What the scaled frame takes of the space. */
  canvas: { width: number; height: number };
}

/**
 * How the device's frame fills a space. The frame always runs the full height
 * of the space: its own height is the space's divided by the scale, so the
 * page shows as far down as fits and the Admin scrolls inside it for the rest.
 * A desktop frame is scaled to the width of the space. A phone frame keeps its
 * natural size, and is scaled down only when the space is narrower or shorter
 * than a phone; it sits in the middle of the space.
 */
export function previewFrameLayout(
  device: PreviewDevice,
  space: { width: number; height: number },
): PreviewFrameLayout {
  const width = PREVIEW_FRAME_WIDTH[device];
  if (space.width <= 0 || space.height <= 0) {
    return {
      scale: 0,
      frame: { width, height: 0 },
      canvas: { width: 0, height: 0 },
    };
  }
  const byWidth = space.width / width;
  const scale =
    device === "desktop"
      ? byWidth
      : Math.min(1, byWidth, space.height / PHONE_NATURAL_HEIGHT);
  return {
    scale,
    frame: { width, height: space.height / scale },
    canvas: { width: width * scale, height: space.height },
  };
}
