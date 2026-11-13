import type { CommandProps } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import {
  addRowAfter,
  addRowBefore,
  isInTable,
  selectedRect,
  TableMap,
} from "@tiptap/pm/tables";
import type { ColumnAlign } from "@/features/posts/editor/extensions/table/cell-align";

// The public page reads alignment from `cell-align.ts`, without ProseMirror.
export {
  type ColumnAlign,
  cellAlign,
} from "@/features/posts/editor/extensions/table/cell-align";

/** Positions of every cell in the selection's columns, in all rows. */
function columnCells(state: EditorState) {
  if (!isInTable(state)) return null;
  const rect = selectedRect(state);
  const cells = rect.map.cellsInRect({
    left: rect.left,
    right: rect.right,
    top: 0,
    bottom: rect.map.height,
  });
  return cells.map((pos) => rect.tableStart + pos);
}

/**
 * The alignment every cell in the selection's columns shares, or null when
 * they differ, use the default, or the selection is outside a table.
 */
export function columnAlignment(state: EditorState): ColumnAlign | null {
  const cells = columnCells(state);
  if (!cells?.length) return null;
  const aligns = new Set(
    cells.map((pos) => state.doc.nodeAt(pos)?.attrs.align ?? null),
  );
  const [align] = aligns;
  return aligns.size === 1 ? align : null;
}

/**
 * Aligns the selection's columns in every row, as a Markdown column
 * alignment does; their current alignment returns them to the default.
 */
export function toggleColumnAlign(align: ColumnAlign) {
  return ({ state, tr, dispatch }: CommandProps) => {
    const cells = columnCells(state);
    if (!cells) return false;
    if (dispatch) {
      const next = columnAlignment(state) === align ? null : align;
      for (const pos of cells) {
        tr.setNodeAttribute(pos, "align", next);
      }
    }
    return true;
  };
}

/** Gives the cells of row `to` the alignment of their column in row `from`. */
function copyRowAlignment(
  tr: Transaction,
  tableStart: number,
  from: number,
  to: number,
) {
  const table = tr.doc.nodeAt(tableStart - 1);
  if (!table) return;
  const map = TableMap.get(table);
  const done = new Set<number>();
  for (let col = 0; col < map.width; col += 1) {
    const pos = map.map[to * map.width + col];
    // Skip a cell spanning down from above, and a wide cell already done.
    if (done.has(pos) || map.findCell(pos).top !== to) continue;
    done.add(pos);
    const align = table.nodeAt(map.map[from * map.width + col])?.attrs.align;
    if (align) tr.setNodeAttribute(tableStart + pos, "align", align);
  }
}

/**
 * Adds a row above or below the selection whose cells keep their column's
 * alignment, so adding rows does not break a column alignment.
 */
export function addRowKeepingAlign(side: "before" | "after") {
  return ({ state, tr, dispatch }: CommandProps) => {
    if (!isInTable(state)) return false;
    const rect = selectedRect(state);
    const add = side === "before" ? addRowBefore : addRowAfter;
    if (!add(state, dispatch)) return false;
    if (dispatch) {
      const row = side === "before" ? rect.top : rect.bottom;
      const neighbour = side === "before" ? row + 1 : row - 1;
      copyRowAlignment(tr, rect.tableStart, neighbour, row);
    }
    return true;
  };
}
