/**
 * The base design variables a Theme thumbnail paints with. The Admin, where
 * thumbnails are shown, carries no Theme, so they follow the Site Config hue
 * and the Colour Scheme as the rest of the workbench does.
 */
const FILLS = {
  page: "var(--fuwari-page-bg)",
  surface: "var(--fuwari-card-bg)",
  banner:
    "color-mix(in srgb, var(--fuwari-primary) 38%, var(--fuwari-page-bg))",
  accent: "var(--fuwari-primary)",
  text: "var(--fuwari-fg-30)",
} as const;

/** x, y, width, height on a 160 × 100 canvas, its fill, its corner radius. */
export type SketchBlock = readonly [
  x: number,
  y: number,
  width: number,
  height: number,
  tone: keyof typeof FILLS,
  radius?: number,
];

/** A schematic of a Theme Shell, drawn as blocks on the page background. */
export function ThumbnailSketch({
  blocks,
}: {
  blocks: ReadonlyArray<SketchBlock>;
}) {
  return (
    <svg
      viewBox="0 0 160 100"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={160} height={100} style={{ fill: FILLS.page }} />
      {blocks.map(([x, y, width, height, tone, radius = 3], index) => (
        <rect
          key={index}
          x={x}
          y={y}
          width={width}
          height={height}
          rx={radius}
          style={{ fill: FILLS[tone] }}
        />
      ))}
    </svg>
  );
}
