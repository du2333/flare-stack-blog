import { ThumbnailSketch, type SketchBlock } from "./thumbnail-sketch";

const BLOCKS: ReadonlyArray<SketchBlock> = [
  // The banner from edge to edge, the navigation lying on it without a bar.
  [0, 0, 160, 58, "banner", 0],
  [12, 6.5, 5, 5, "surface", 2.5],
  [62, 7.5, 10, 3, "surface", 1.5],
  [76, 7.5, 10, 3, "surface", 1.5],
  [90, 7.5, 10, 3, "surface", 1.5],
  [138, 7.5, 10, 3, "surface", 1.5],
  // The introduction in its lower left corner: a heavy title, a line, and
  // the author's avatar with a name.
  [12, 23, 54, 7, "surface", 2],
  [12, 34, 38, 3, "surface", 1.5],
  [12, 41, 6, 6, "accent", 3],
  [21, 42.5, 14, 3, "surface", 1.5],
  // The strip astride the banner's lower edge: two ways into the Posts, each
  // a title and a row of pills, with a hairline between them.
  [12, 52, 136, 11, "surface", 5],
  [18, 56, 7, 3, "text", 1.5],
  [29, 55.5, 13, 4, "banner", 2],
  [45, 55.5, 15, 4, "banner", 2],
  [63, 55.5, 11, 4, "banner", 2],
  [80, 54.5, 0.6, 6, "text", 0],
  [86, 56, 7, 3, "text", 1.5],
  [97, 55.5, 12, 4, "banner", 2],
  [112, 55.5, 16, 4, "banner", 2],
  [131, 55.5, 11, 4, "banner", 2],
  // Two tiles under it, each led by its cover: the cover is the top of the
  // tile, squared off where the text begins.
  [12, 67, 66, 40, "surface", 5],
  [12, 67, 66, 22, "banner", 5],
  [12, 84, 66, 6, "surface", 0],
  [18, 89, 34, 3.5, "text", 1.75],
  [18, 95, 46, 2.5, "text", 1.25],
  [82, 67, 66, 40, "surface", 5],
  [82, 67, 66, 22, "banner", 5],
  [82, 84, 66, 6, "surface", 0],
  [88, 89, 40, 3.5, "text", 1.75],
  [88, 95, 30, 2.5, "text", 1.25],
];

/** 「沉浸」: the banner fills the first screen, a strip of ways in astride its edge, two columns of tiles. */
export function ImmersiveThumbnail() {
  return <ThumbnailSketch blocks={BLOCKS} />;
}
