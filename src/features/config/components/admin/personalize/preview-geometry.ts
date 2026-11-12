export type PreviewDevice = "desktop" | "phone";

/** The size the public page is rendered at, before it is scaled to fit. */
export const PREVIEW_FRAME_SIZE: Record<
  PreviewDevice,
  { width: number; height: number }
> = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
};

/**
 * The scale that fits the device's frame into a space. A desktop frame fills
 * the width, unless the space is too short for it; a phone frame stays at its natural size where it fits, and
 * shrinks to the width or to the height of the space (`maxHeight`) otherwise.
 */
export function previewScale(
  device: PreviewDevice,
  space: { width: number; maxHeight: number },
): number {
  const frame = PREVIEW_FRAME_SIZE[device];
  if (space.width <= 0 || space.maxHeight <= 0) return 0;
  const byWidth = space.width / frame.width;
  const byHeight = space.maxHeight / frame.height;
  if (device === "desktop") return Math.min(byWidth, byHeight);
  return Math.min(1, byWidth, byHeight);
}
