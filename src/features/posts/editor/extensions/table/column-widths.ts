import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TableMap } from "@tiptap/pm/tables";
import {
  columnLayout,
  type TableColumnLayout,
} from "@/features/posts/editor/extensions/table/column-layout";

/**
 * The layout for a table in the editor (ADR 0028), or `null` when no column
 * has a stored width. The public page reads the same layout from the JSON
 * body with `jsonTableColumnLayout`.
 */
export function tableColumnLayout(
  table: ProseMirrorNode,
): TableColumnLayout | null {
  return columnLayout(storedColumnWidths(table));
}

/** The stored pixel width of every column, or `null` where none is stored. */
function storedColumnWidths(table: ProseMirrorNode): Array<number | null> {
  const map = TableMap.get(table);
  const widths: Array<number | null> = Array.from(
    { length: map.width },
    () => null,
  );
  for (let col = 0; col < map.width; col += 1) {
    for (let row = 0; row < map.height; row += 1) {
      const pos = map.map[row * map.width + col];
      const cell = table.nodeAt(pos);
      const colwidth = cell?.attrs.colwidth as Array<number> | null | undefined;
      const width = colwidth?.[col - map.colCount(pos)];
      if (width && width > 0) {
        widths[col] = width;
        break;
      }
    }
  }
  return widths;
}

/**
 * Drags the border between column `col` and the next one: `col` becomes
 * `width` and the next column gives or takes the difference, so a full-width
 * table keeps its total and the other columns stay put. Neither column gets
 * narrower than `minWidth`.
 */
export function resizeColumn(
  widths: ReadonlyArray<number>,
  col: number,
  width: number,
  minWidth: number,
): Array<number> {
  const pair = widths[col] + widths[col + 1];
  const next = Math.min(Math.max(width, minWidth), pair - minWidth);
  const result = [...widths];
  result[col] = next;
  result[col + 1] = pair - next;
  return result;
}
