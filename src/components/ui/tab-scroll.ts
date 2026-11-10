/** Which ends of a horizontally scrolling row still have something to reveal. */
export function scrollEdges(row: {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}) {
  // Sub-pixel scroll positions would otherwise leave a cue at a row's end.
  const slack = 1;
  return {
    start: row.scrollLeft > slack,
    end: row.scrollLeft + row.clientWidth < row.scrollWidth - slack,
  };
}

/** The scroll position that centers a tab in its row, kept inside the row. */
export function centeredScrollLeft(
  row: { scrollWidth: number; clientWidth: number },
  tab: { offsetLeft: number; offsetWidth: number },
) {
  const centered = tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2;
  return Math.min(Math.max(0, centered), row.scrollWidth - row.clientWidth);
}
