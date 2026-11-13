import { expect, it } from "vitest";
import { resolveBrandMarkImage } from "./brand-mark";

const site = {
  avatar: "/images/avatar.png",
  icons: { faviconSvg: "/favicon.svg", favicon96: "/favicon-96x96.png" },
};

it("shows no image for the built-in icon and for no mark", () => {
  expect(resolveBrandMarkImage("default", site)).toBeNull();
  expect(resolveBrandMarkImage("none", site)).toBeNull();
});

it("shows the SVG site icon, or the 96px one when there is no SVG", () => {
  expect(resolveBrandMarkImage("siteIcon", site)).toEqual({
    kind: "siteIcon",
    src: "/favicon.svg",
  });
  expect(
    resolveBrandMarkImage("siteIcon", {
      ...site,
      icons: { ...site.icons, faviconSvg: " " },
    }),
  ).toEqual({ kind: "siteIcon", src: "/favicon-96x96.png" });
});

it("shows the avatar", () => {
  expect(resolveBrandMarkImage("avatar", site)).toEqual({
    kind: "avatar",
    src: "/images/avatar.png",
  });
});

it("gives no image when the chosen one is not set", () => {
  expect(resolveBrandMarkImage("avatar", { ...site, avatar: "" })).toBeNull();
  expect(
    resolveBrandMarkImage("siteIcon", {
      ...site,
      icons: { faviconSvg: "", favicon96: "" },
    }),
  ).toBeNull();
});
