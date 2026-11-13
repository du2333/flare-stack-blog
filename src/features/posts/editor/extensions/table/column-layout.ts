import type { JSONContent } from "@tiptap/react";

/**
 * How a table's stored column widths are shown (ADR 0028). Tiptap stores
 * pixel widths per cell (`colwidth`, one entry per spanned column); the editor
 * and the public page both read them as proportions of a full-width table.
 * Nothing here imports the editor, so the public page can use it.
 */
export interface TableColumnLayout {
  /** CSS width of each column, as a percentage of the table. */
  widths: Array<string>;
  /**
   * CSS min-width of the table: enough for the narrowest column to get
   * `MIN_COLUMN_REM`, but never more than `MAX_MIN_WIDTH_SHARE` of the stored
   * pixel layout. Below it the table scrolls sideways instead of squeezing
   * columns.
   */
  minWidth: string;
}

/** The width the narrowest column keeps on narrow screens. */
export const MIN_COLUMN_REM = 5;

/**
 * The most of its stored layout a table may insist on. Tables are laid out in
 * the editor, which is wider than the published article; a column dragged to
 * the minimum would otherwise make the table demand its whole editor width and
 * scroll on desktop.
 */
export const MAX_MIN_WIDTH_SHARE = 2 / 3;

/**
 * The layout for the stored pixel width of every column (`null` where none is
 * stored), or `null` when no column has a stored width.
 */
export function columnLayout(
  stored: ReadonlyArray<number | null>,
): TableColumnLayout | null {
  if (stored.every((width) => width === null)) return null;

  // A column without a stored width counts as an average stored column.
  const set = stored.filter((width) => width !== null);
  const average = set.reduce((sum, width) => sum + width, 0) / set.length;
  const resolved = stored.map((width) => width ?? average);
  const total = resolved.reduce((sum, width) => sum + width, 0);
  const narrowest = Math.min(...resolved) / total;
  return {
    widths: resolved.map((width) => percent(width / total)),
    minWidth: `min(${round(MIN_COLUMN_REM / narrowest)}rem, ${round(total * MAX_MIN_WIDTH_SHARE)}px)`,
  };
}

/** The layout for a table in a Post's JSON body; see `columnLayout`. */
export function jsonTableColumnLayout(
  table: JSONContent,
): TableColumnLayout | null {
  return columnLayout(jsonStoredColumnWidths(table));
}

function percent(share: number): string {
  return `${round(share * 100)}%`;
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

/** A cell attribute as ProseMirror reads it: missing means the default. */
function cellAttr(cell: JSONContent, name: "colspan" | "rowspan"): number {
  const value = cell.attrs?.[name];
  return value === undefined ? 1 : value;
}

/**
 * Which cell covers each slot of the table's grid, row by row. It places
 * cells as ProseMirror's `TableMap` does, including in a table whose spans
 * do not add up, so both read the same widths from the same body.
 */
function jsonTableMap(table: JSONContent) {
  const rows = (table.content ?? []).map((row) => row.content ?? []);
  const height = rows.length;
  const width = gridWidth(rows);
  const map: Array<JSONContent | undefined> = Array.from(
    { length: width * height },
    () => undefined,
  );
  let mapPos = 0;
  for (let row = 0; row < height; row += 1) {
    const cells = rows[row];
    for (let i = 0; ; i += 1) {
      while (mapPos < map.length && map[mapPos] !== undefined) mapPos += 1;
      if (i === cells.length) break;
      const cell = cells[i];
      const colspan = cellAttr(cell, "colspan");
      const rowspan = cellAttr(cell, "rowspan");
      for (let h = 0; h < rowspan; h += 1) {
        if (h + row >= height) break;
        const start = mapPos + h * width;
        for (let w = 0; w < colspan; w += 1) {
          const slot = start + w;
          if (slot < map.length && map[slot] === undefined) map[slot] = cell;
        }
      }
      mapPos += colspan;
    }
    mapPos = Math.max(mapPos, (row + 1) * width);
  }
  return { width, height, map };
}

/** The table's column count: its widest row, counting cells spanning down. */
function gridWidth(rows: ReadonlyArray<ReadonlyArray<JSONContent>>): number {
  let width = -1;
  let hasRowSpan = false;
  for (let row = 0; row < rows.length; row += 1) {
    let rowWidth = 0;
    if (hasRowSpan) {
      for (let j = 0; j < row; j += 1) {
        for (const cell of rows[j]) {
          if (j + cellAttr(cell, "rowspan") > row) {
            rowWidth += cellAttr(cell, "colspan");
          }
        }
      }
    }
    for (const cell of rows[row]) {
      rowWidth += cellAttr(cell, "colspan");
      if (cellAttr(cell, "rowspan") > 1) hasRowSpan = true;
    }
    width = width === -1 ? rowWidth : Math.max(width, rowWidth);
  }
  return width;
}

/** The stored pixel width of every column, or `null` where none is stored. */
function jsonStoredColumnWidths(table: JSONContent): Array<number | null> {
  const { width, height, map } = jsonTableMap(table);
  const widths: Array<number | null> = Array.from(
    { length: Math.max(width, 0) },
    () => null,
  );
  for (let col = 0; col < width; col += 1) {
    for (let row = 0; row < height; row += 1) {
      const cell = map[row * width + col];
      if (!cell) continue;
      const colwidth = cell.attrs?.colwidth as Array<number> | null | undefined;
      const stored = colwidth?.[col - (map.indexOf(cell) % width)];
      if (stored && stored > 0) {
        widths[col] = stored;
        break;
      }
    }
  }
  return widths;
}
