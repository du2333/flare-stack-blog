import type { ColourScheme } from "@/components/common/colour-scheme-provider";

/**
 * Mermaid `themeVariables` for the `base` theme, taken from the Fuwari design
 * tokens in effect on the diagram's element (ADR 0021), so diagrams follow the
 * site hue and the colour scheme.
 */

const COLOR_TOKENS = {
  background: "--theme-raised",
  primaryColor: "--theme-tonal-bg",
  primaryTextColor: "--fuwari-fg",
  primaryBorderColor: "--theme-accent",
  secondaryColor: "--fuwari-selection-bg",
  tertiaryColor: "--fuwari-page-bg",
  lineColor: "--theme-tonal-fg",
  // Edge labels sit on the diagram background instead of a derived block.
  edgeLabelBackground: "--theme-raised",
  textColor: "--fuwari-fg",
  noteBkgColor: "--fuwari-warning-bg",
  noteBorderColor: "--fuwari-warning",
  noteTextColor: "--fuwari-fg",
  errorBkgColor: "--fuwari-danger-bg",
  errorTextColor: "--fuwari-danger-fg",
} as const;

export function mermaidThemeVariables(
  element: Element | null,
  colourScheme: ColourScheme,
): Record<string, string | boolean> {
  const variables: Record<string, string | boolean> = {
    darkMode: colourScheme === "dark",
  };
  if (!element) return variables;

  const style = getComputedStyle(element);
  if (style.fontFamily) variables.fontFamily = style.fontFamily;

  const toHex = colorConverter(
    style.getPropertyValue(COLOR_TOKENS.background).trim(),
  );
  if (!toHex) return variables;

  for (const [name, token] of Object.entries(COLOR_TOKENS)) {
    const value = style.getPropertyValue(token).trim();
    if (value) variables[name] = toHex(value);
  }
  return variables;
}

/**
 * Mermaid derives shades from these colours with a parser that only knows hex,
 * rgb and hsl, while the Fuwari tokens are oklch and partly transparent. The
 * canvas resolves any CSS colour, composited over the diagram background, to
 * an opaque hex value. Returns `null` where no canvas is available.
 */
function colorConverter(background: string) {
  if (typeof OffscreenCanvas === "undefined") return null;
  const context = new OffscreenCanvas(1, 1).getContext("2d", {
    willReadFrequently: true,
  });
  if (!context) return null;

  return (color: string) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = background || "#fff";
    context.fillRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  };
}
