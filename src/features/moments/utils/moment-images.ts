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
