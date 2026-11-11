import { ThumbnailSketch, type SketchBlock } from "./thumbnail-sketch";

const BLOCKS: ReadonlyArray<SketchBlock> = [
  // The banner, with the top bar floating over it.
  [0, 0, 160, 44, "banner", 0],
  [12, 6, 136, 9, "surface"],
  [18, 9, 18, 3, "accent", 1.5],
  // The narrow left column: the profile card.
  [12, 36, 38, 56, "surface"],
  [23, 42, 16, 16, "accent", 8],
  [20, 63, 22, 3, "text", 1.5],
  [23, 70, 16, 3, "text", 1.5],
  // The wide content column: two post cards.
  [56, 36, 92, 26, "surface"],
  [62, 42, 48, 4, "text", 2],
  [62, 50, 70, 3, "text", 1.5],
  [56, 66, 92, 26, "surface"],
  [62, 72, 40, 4, "text", 2],
  [62, 80, 64, 3, "text", 1.5],
];

/** 「经典」: a top bar over the banner, a narrow left column and a wide one. */
export function ClassicThumbnail() {
  return <ThumbnailSketch blocks={BLOCKS} />;
}
