export type PreviewDevice = "desktop" | "phone";

/**
 * The viewport the public page is rendered in, in CSS pixels: a true one, so
 * what depends on the viewport's height (a first screen of 78svh, a rail as
 * tall as the window) is laid out as it is for a visitor with that screen.
 */
export const PREVIEW_VIEWPORT: Record<
  PreviewDevice,
  { width: number; height: number }
> = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
};

export interface PreviewFrameLayout {
  scale: number;
  /** The iframe's size in CSS pixels, before the scale: the device's viewport. */
  frame: { width: number; height: number };
  /** What the scaled frame takes of the space. */
  canvas: { width: number; height: number };
}

/**
 * How the device's viewport fits a space, scaled uniformly and centred by the
 * caller. A desktop frame shrinks to the width or the height of the space,
 * whichever is tighter. A phone frame keeps its natural size and is scaled
 * down only when the space is narrower or shorter than a phone.
 */
export function previewFrameLayout(
  device: PreviewDevice,
  space: { width: number; height: number },
): PreviewFrameLayout {
  const frame = PREVIEW_VIEWPORT[device];
  if (space.width <= 0 || space.height <= 0) {
    return { scale: 0, frame, canvas: { width: 0, height: 0 } };
  }
  const fit = Math.min(space.width / frame.width, space.height / frame.height);
  const scale = device === "desktop" ? fit : Math.min(1, fit);
  return {
    scale,
    frame,
    canvas: { width: frame.width * scale, height: frame.height * scale },
  };
}
