/** Images a Moment's grid shows; the rest open in the lightbox only. */
export const MOMENT_GRID_IMAGES_MAX = 9;

export interface MomentImageLayout {
  /** Columns of the grid: 1 is one large image keeping its ratio. */
  columns: 1 | 2 | 3;
  /** Images drawn in the grid. */
  shown: number;
  /** Images past the grid, counted as +N on the last one drawn. */
  more: number;
}

/**
 * How a Moment's images are laid out: one large, two to four in two columns,
 * five to nine in three, and past nine the first nine with the rest counted.
 */
export function momentImageLayout(count: number): MomentImageLayout {
  const shown = Math.min(count, MOMENT_GRID_IMAGES_MAX);
  const columns = shown <= 1 ? 1 : shown <= 4 ? 2 : 3;
  return { columns, shown, more: count - shown };
}

/** Fallback ratio of a single image whose size is unknown. */
export const MOMENT_IMAGE_FALLBACK_RATIO = "4 / 3";

export interface SingleImageBox {
  /** Reserves the final box before the image loads. */
  style: { aspectRatio: string; width: string };
  /** Whether the real ratio is known; unknown ones sit in a 4:3 box. */
  known: boolean;
}

/**
 * The box a lone image occupies, set before it loads so the card does not
 * grow when it arrives. Known sizes keep their ratio, capped at `maxHeight`
 * (a CSS length), the container width and the natural width (never upscaled); unknown sizes take the container
 * width as a 4:3 box, the image contained inside it.
 */
export function singleImageBox(
  width: number | null | undefined,
  height: number | null | undefined,
  maxHeight: string,
): SingleImageBox {
  if (!width || !height || width < 0 || height < 0) {
    return {
      style: { aspectRatio: MOMENT_IMAGE_FALLBACK_RATIO, width: "100%" },
      known: false,
    };
  }
  return {
    style: {
      aspectRatio: `${width} / ${height}`,
      width: `min(100%, calc(${maxHeight} * ${width} / ${height}), ${width}px)`,
    },
    known: true,
  };
}
