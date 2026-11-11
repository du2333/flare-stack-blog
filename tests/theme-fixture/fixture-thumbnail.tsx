import {
  ThumbnailSketch,
  type SketchBlock,
} from "@/features/theme/thumbnails/thumbnail-sketch";

const BLOCKS: ReadonlyArray<SketchBlock> = [
  [0, 0, 160, 30, "banner", 0],
  [0, 30, 160, 11, "surface", 0],
  [8, 34, 22, 3, "accent", 1.5],
  [8, 48, 100, 44, "surface"],
  [14, 55, 56, 4, "text", 2],
  [14, 63, 80, 3, "text", 1.5],
  [14, 70, 72, 3, "text", 1.5],
  [114, 48, 38, 20, "surface"],
  [114, 72, 38, 20, "surface"],
];

/** The fixture shell: the banner, a header under it, the content, then the cards. */
export function FixtureThumbnail() {
  return <ThumbnailSketch blocks={BLOCKS} />;
}
