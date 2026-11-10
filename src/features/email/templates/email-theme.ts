import type { SiteConfig } from "@/features/config/config.schema";

/** The site details every email shows: its name and primary hue. */
export interface EmailSite {
  title: string;
  primaryHue: number;
}

export function emailSiteOf(
  site: Pick<SiteConfig, "title" | "primaryHue">,
): EmailSite {
  return { title: site.title, primaryHue: site.primaryHue };
}

function toSrgbChannel(linear: number) {
  const value =
    linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
  const byte = Math.round(Math.min(1, Math.max(0, value)) * 255);
  return byte.toString(16).padStart(2, "0");
}

/**
 * Email clients do not support `oklch()` or CSS variables, so the Fuwari
 * palette is resolved to hex. Out-of-gamut colors are clamped per channel.
 */
export function oklchToHex(l: number, c: number, h: number) {
  const hue = (h * Math.PI) / 180;
  const a = c * Math.cos(hue);
  const b = c * Math.sin(hue);

  const lms = [
    l + 0.3963377774 * a + 0.2158037573 * b,
    l - 0.1055613458 * a - 0.0638541728 * b,
    l - 0.0894841775 * a - 1.291485548 * b,
  ].map((value) => value ** 3);

  const red =
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2];
  const green =
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2];
  const blue =
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2];

  return `#${toSrgbChannel(red)}${toSrgbChannel(green)}${toSrgbChannel(blue)}`;
}

/** The light Fuwari palette (src/styles.css) for a primary hue. */
export function emailTheme(hue: number) {
  return {
    pageBg: oklchToHex(0.95, 0.01, hue),
    cardBg: "#ffffff",
    primary: oklchToHex(0.7, 0.14, hue),
    link: oklchToHex(0.55, 0.12, hue),
    regularBg: oklchToHex(0.95, 0.025, hue),
    divider: oklchToHex(0.92, 0.01, hue),
    // --fuwari-fg, -75, -50 over a white card.
    text: "#1a1a1a",
    body: "#404040",
    muted: "#808080",
  };
}

export type EmailTheme = ReturnType<typeof emailTheme>;
