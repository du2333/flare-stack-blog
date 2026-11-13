export type ColumnAlign = "left" | "center" | "right";

const COLUMN_ALIGNS: ReadonlySet<unknown> = new Set([
  "left",
  "center",
  "right",
]);

/** A table cell's stored alignment, or undefined for the default. */
export function cellAlign(attrs: { align?: unknown }): ColumnAlign | undefined {
  return COLUMN_ALIGNS.has(attrs.align)
    ? (attrs.align as ColumnAlign)
    : undefined;
}
