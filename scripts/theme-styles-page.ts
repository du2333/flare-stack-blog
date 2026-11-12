/** What scripts/check-theme-styles.ts reads from a server-rendered page. */
export interface RenderedPage {
  /** The `data-theme` of `<html>`. */
  dataTheme: string | undefined;
  /** The `--fuwari-hue` the style of `<html>` sets. */
  hue: string | undefined;
  /** The stylesheets the page links. */
  stylesheetHrefs: Array<string>;
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

export function readRenderedPage(html: string): RenderedPage {
  const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? "";
  const style = attribute(htmlTag, "style") ?? "";
  return {
    dataTheme: attribute(htmlTag, "data-theme"),
    hue: /--fuwari-hue:\s*([^;]+)/.exec(style)?.[1]?.trim(),
    stylesheetHrefs: [...html.matchAll(/<link[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => attribute(tag, "rel") === "stylesheet")
      .map((tag) => attribute(tag, "href")!),
  };
}

/** A hue as far as can be from `saved`, so a draft of it cannot pass for it. */
export function contrastingHue(saved: number): number {
  return (saved + 180) % 360;
}
