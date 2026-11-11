import { ThumbnailSketch, type SketchBlock } from "./thumbnail-sketch";

const BLOCKS: ReadonlyArray<SketchBlock> = [
  // The bare top line: a mark on the left, three links on the right.
  [12, 6.5, 5, 5, "accent", 2.5],
  [100, 7.5, 12, 3, "text", 1.5],
  [118, 7.5, 12, 3, "text", 1.5],
  [136, 7.5, 12, 3, "text", 1.5],
  // The left block: a kicker, two heavy headline bars (a highlight behind
  // part of the second) and a pill.
  [12, 22, 16, 2.5, "accent", 1.25],
  [12, 29, 66, 7, "text", 2],
  [34, 40, 30, 9, "banner", 2],
  [12, 41, 50, 7, "text", 2],
  [12, 54, 22, 7, "accent", 3.5],
  // The portrait frame with a tinted block offset behind it, and the avatar
  // seal on its lower-left corner.
  [100, 26, 40, 46, "banner", 6],
  [94, 20, 40, 46, "surface", 6],
  [87, 59, 14, 14, "page", 7],
  [89, 61, 10, 10, "accent", 5],
  // Two rows between hairlines: a title and a date.
  [12, 77, 136, 0.8, "text", 0],
  [12, 79.5, 52, 3, "text", 1.5],
  [128, 79.5, 20, 3, "text", 1.5],
  [12, 85, 136, 0.8, "text", 0],
  [12, 87.5, 40, 3, "text", 1.5],
  [128, 87.5, 20, 3, "text", 1.5],
  [12, 93, 136, 0.8, "text", 0],
];

/** 「名片」: a bare top line, a headline beside a portrait, an index below. */
export function NamecardThumbnail() {
  return <ThumbnailSketch blocks={BLOCKS} />;
}
