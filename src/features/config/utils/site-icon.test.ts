import { expect, it } from "vitest";
import {
  isUploadedIcon,
  planSiteIcon,
  resolveFaviconSvg,
  SITE_ICON_MIN_SIZE,
} from "./site-icon";

it("makes the four raster sizes, each at its fixed path, from a large enough square", () => {
  for (const width of [SITE_ICON_MIN_SIZE, 1024]) {
    const plan = planSiteIcon({ format: "image/png", width, height: width });
    expect(plan.error).toBeNull();
    expect(plan.data).toEqual([
      { field: "favicon96", size: 96, path: "favicon/favicon-96x96.png" },
      {
        field: "appleTouchIcon",
        size: 180,
        path: "favicon/apple-touch-icon.png",
      },
      {
        field: "webApp192",
        size: 192,
        path: "favicon/web-app-manifest-192x192.png",
      },
      {
        field: "webApp512",
        size: 512,
        path: "favicon/web-app-manifest-512x512.png",
      },
    ]);
  }
  expect(
    planSiteIcon({ format: "image/jpeg", width: 600, height: 600 }).error,
  ).toBeNull();
});

it("refuses an image that is not square", () => {
  expect(
    planSiteIcon({ format: "image/png", width: 1024, height: 1023 }).error,
  ).toEqual({ reason: "SITE_ICON_NOT_SQUARE", width: 1024, height: 1023 });
});

it("refuses a square smaller than the minimum", () => {
  expect(
    planSiteIcon({ format: "image/png", width: 400, height: 400 }).error,
  ).toEqual({
    reason: "SITE_ICON_TOO_SMALL",
    width: 400,
    height: 400,
  });
  expect(
    planSiteIcon({ format: "image/png", width: 511, height: 511 }).error
      ?.reason,
  ).toBe("SITE_ICON_TOO_SMALL");
});

it("refuses anything but a PNG or a JPEG by its bytes", () => {
  expect(planSiteIcon({ format: "image/svg+xml" }).error).toEqual({
    reason: "SITE_ICON_UNSUPPORTED_TYPE",
  });
  for (const format of ["image/webp", "image/gif"])
    expect(
      planSiteIcon({ format, width: 1024, height: 1024 }).error?.reason,
    ).toBe("SITE_ICON_UNSUPPORTED_TYPE");
});

it("declares the default SVG only while the raster icon is the default too", () => {
  const svg = "/images/asset/favicon/favicon.svg?original=true&v=1";
  const raster = "/images/asset/favicon/favicon-96x96.png?original=true&v=1";
  // Nothing uploaded, whether the config is empty or carries the default paths.
  expect(resolveFaviconSvg(undefined)).toBe("/favicon.svg");
  expect(
    resolveFaviconSvg({
      faviconSvg: "/favicon.svg",
      favicon96: "/favicon-96x96.png",
    }),
  ).toBe("/favicon.svg");
  // An uploaded raster icon, with the default SVG saved or none.
  expect(
    resolveFaviconSvg({ faviconSvg: "/favicon.svg", favicon96: raster }),
  ).toBe("");
  expect(resolveFaviconSvg({ faviconSvg: "", favicon96: raster })).toBe("");
  // An uploaded SVG always.
  expect(resolveFaviconSvg({ faviconSvg: svg, favicon96: raster })).toBe(svg);
  expect(resolveFaviconSvg({ faviconSvg: svg })).toBe(svg);
});

it("counts a default path as nothing uploaded", () => {
  expect(isUploadedIcon("favicon96", "/favicon-96x96.png")).toBe(false);
  expect(isUploadedIcon("favicon96", " ")).toBe(false);
  expect(isUploadedIcon("favicon96", undefined)).toBe(false);
  expect(
    isUploadedIcon("favicon96", "/images/asset/favicon/favicon-96x96.png?v=1"),
  ).toBe(true);
});
