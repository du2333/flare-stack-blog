import { ThumbnailSketch, type SketchBlock } from "./thumbnail-sketch";

const BLOCKS: ReadonlyArray<SketchBlock> = [
  // The bare top line: a mark on the left, three links on the right.
  [12, 6.5, 5, 5, "accent", 2.5],
  [100, 7.5, 12, 3, "text", 1.5],
  [118, 7.5, 12, 3, "text", 1.5],
  [136, 7.5, 12, 3, "text", 1.5],
  // The left column of the first screen: a kicker, two heavy headline bars
  // (a highlight behind part of the second) and a pill.
  [12, 21, 16, 2.5, "accent", 1.25],
  [12, 27, 56, 6.5, "text", 2],
  [30, 36.5, 28, 8.5, "banner", 2],
  [12, 37.5, 44, 6.5, "text", 2],
  [12, 49.5, 20, 6.5, "accent", 3.25],
  // The right column: the portrait frame with a tinted block offset behind
  // it, and the avatar seal on its lower-left corner.
  [113, 21, 35, 41, "banner", 5.5],
  [108, 17, 35, 41, "surface", 5.5],
  [102.5, 46, 11, 11, "page", 5.5],
  [104, 47.5, 8, 8, "accent", 4],
  // Under the words, the content: two rows between hairlines, each a title
  // and a line beside a small cover.
  [12, 67, 84, 0.8, "text", 0],
  [12, 71, 46, 3.5, "text", 1.75],
  [12, 77, 60, 2.5, "text", 1.25],
  [82, 70, 14, 10.5, "banner", 2.5],
  [12, 83.5, 84, 0.8, "text", 0],
  [12, 87.5, 38, 3.5, "text", 1.75],
  [12, 93.5, 54, 2.5, "text", 1.25],
  [82, 86.5, 14, 10.5, "banner", 2.5],
  // Under the frame and as wide as it, the cards: a small title over a row
  // of pills, twice.
  [108, 67, 40, 0.8, "text", 0],
  [108, 70.5, 9, 2.5, "accent", 1.25],
  [108, 75.5, 12, 5, "surface", 2.5],
  [122, 75.5, 15, 5, "surface", 2.5],
  [139, 75.5, 9, 5, "surface", 2.5],
  [108, 83.5, 40, 0.8, "text", 0],
  [108, 87, 9, 2.5, "accent", 1.25],
  [108, 92, 14, 5, "surface", 2.5],
  [124, 92, 11, 5, "surface", 2.5],
  [137, 92, 11, 5, "surface", 2.5],
];

/** 「名片」: a bare top line, a headline beside a portrait, then the same two columns: rows under the words, cards under the frame. */
export function NamecardThumbnail() {
  return <ThumbnailSketch blocks={BLOCKS} />;
}
