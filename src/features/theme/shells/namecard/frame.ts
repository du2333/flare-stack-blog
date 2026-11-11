/**
 * The shape of the frame the banner sits in on the home page: portrait
 * (4:5), standard (4:3) or wide (16:7). 「名片」's own option, stored in Site
 * Config as `theme.options.namecard.frame`.
 */
export const FRAMES = ["portrait", "standard", "wide"] as const;
export type Frame = (typeof FRAMES)[number];
export const DEFAULT_FRAME: Frame = "portrait";

export function isFrame(value: unknown): value is Frame {
  return FRAMES.some((frame) => frame === value);
}
