export type PreviewDevice = "desktop" | "phone";

/**
 * The viewport the public page is rendered in, in CSS pixels: a true one, so
 * what depends on the viewport's height (a first screen of 78svh, a rail as
 * tall as the window) is laid out as it is for a visitor with that screen.
 * The phone's is fixed. The desktop's is a laptop's width and at least this
 * tall; where the space is taller for that width, the window is too, as a
 * browser window on a taller screen is.
 */
export const PREVIEW_VIEWPORT: Record<
  PreviewDevice,
  { width: number; height: number }
> = {
  desktop: { width: 1280, height: 800 },
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
 * caller. A desktop frame fills the width of the space and all of its height:
 * the viewport grows taller than its least height to do so, and only a space
 * too short for that least height shrinks the frame by its height instead. A
 * phone frame keeps its natural size and is scaled down only when the space
 * is narrower or shorter than a phone.
 */
export function previewFrameLayout(
  device: PreviewDevice,
  space: { width: number; height: number },
): PreviewFrameLayout {
  const base = PREVIEW_VIEWPORT[device];
  if (space.width <= 0 || space.height <= 0) {
    return { scale: 0, frame: base, canvas: { width: 0, height: 0 } };
  }
  const fit = Math.min(space.width / base.width, space.height / base.height);
  if (device === "phone") {
    const scale = Math.min(1, fit);
    return {
      scale,
      frame: base,
      canvas: { width: base.width * scale, height: base.height * scale },
    };
  }
  const frame = {
    width: base.width,
    height: Math.max(base.height, Math.round(space.height / fit)),
  };
  return {
    scale: fit,
    frame,
    canvas: { width: frame.width * fit, height: frame.height * fit },
  };
}
