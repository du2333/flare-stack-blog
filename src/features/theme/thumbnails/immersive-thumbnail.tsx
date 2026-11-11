import { ThumbnailSketch, type SketchBlock } from "./thumbnail-sketch";

const BLOCKS: ReadonlyArray<SketchBlock> = [
  // The banner from edge to edge, the navigation lying on it without a bar.
  [0, 0, 160, 64, "banner", 0],
  [12, 6.5, 5, 5, "surface", 2.5],
  [62, 7.5, 10, 3, "surface", 1.5],
  [76, 7.5, 10, 3, "surface", 1.5],
  [90, 7.5, 10, 3, "surface", 1.5],
  [138, 7.5, 10, 3, "surface", 1.5],
  // The introduction in its lower left corner: a heavy title, a line, and
  // the author's avatar with a name.
  [12, 28, 58, 7, "surface", 2],
  [12, 39, 40, 3, "surface", 1.5],
  [12, 46.5, 6, 6, "accent", 3],
  [21, 48, 14, 3, "surface", 1.5],
  // Two tiles rising over the banner's lower edge.
  [12, 58, 65, 46, "surface", 5],
  [18, 64, 53, 14, "banner", 3],
  [18, 83, 34, 4, "text", 2],
  [18, 91, 46, 3, "text", 1.5],
  [83, 58, 65, 46, "surface", 5],
  [89, 64, 53, 14, "banner", 3],
  [89, 83, 40, 4, "text", 2],
  [89, 91, 30, 3, "text", 1.5],
];

/** 「沉浸」: the banner fills the first screen, the content rises over its edge. */
export function ImmersiveThumbnail() {
  return <ThumbnailSketch blocks={BLOCKS} />;
}
