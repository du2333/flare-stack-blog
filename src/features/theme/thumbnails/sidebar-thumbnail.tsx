import { ThumbnailSketch, type SketchBlock } from "./thumbnail-sketch";

const BLOCKS: ReadonlyArray<SketchBlock> = [
  // The rail, on the page itself: a mark and the title, the avatar, the
  // author's name over a line.
  [10, 7, 5, 5, "accent", 1.5],
  [18, 8.25, 16, 2.5, "text", 1.25],
  [10, 18, 13, 13, "accent", 4],
  [10, 35, 15, 3, "text", 1.5],
  [10, 41, 26, 2, "text", 1],
  // The navigation: the pill of the current entry, then two more entries.
  [8, 49, 32, 8, "surface", 2.5],
  [7.4, 51, 1.2, 4, "accent", 0.6],
  [12, 51.75, 13, 2.5, "accent", 1.25],
  [12, 61.75, 17, 2.5, "text", 1.25],
  [12, 70.75, 11, 2.5, "text", 1.25],
  // Its foot: the social links, under them the account entry and a switch.
  [10, 84, 3, 3, "text", 1.5],
  [15.5, 84, 3, 3, "text", 1.5],
  [8, 89.5, 32, 0.6, "text", 0],
  [10, 93, 14, 2.5, "text", 1.25],
  [35, 92.75, 3, 3, "text", 1.5],
  // The content column: the tagline as a headline over the banner, a
  // rounded band.
  [48, 7, 5, 1, "accent", 0.5],
  [48, 11, 46, 4.5, "text", 2],
  [48, 20, 102, 26, "banner", 5],
  // Two tiles under it, each led by its cover: the cover is the top of the
  // tile, squared off where the text begins.
  [48, 50, 49, 58, "surface", 5],
  [48, 50, 49, 24, "banner", 5],
  [48, 69, 49, 6, "surface", 0],
  [53, 79, 30, 3.5, "text", 1.75],
  [53, 85.5, 38, 2.5, "text", 1.25],
  [53, 91, 26, 2.5, "text", 1.25],
  [101, 50, 49, 58, "surface", 5],
  [101, 50, 49, 24, "banner", 5],
  [101, 69, 49, 6, "surface", 0],
  [106, 79, 36, 3.5, "text", 1.75],
  [106, 85.5, 28, 2.5, "text", 1.25],
  [106, 91, 34, 2.5, "text", 1.25],
];

/** 「侧栏」: a rail with the author and the navigation, a rounded banner over two columns of tiles. */
export function SidebarThumbnail() {
  return <ThumbnailSketch blocks={BLOCKS} />;
}
