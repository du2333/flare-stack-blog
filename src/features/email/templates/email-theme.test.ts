import { describe, expect, it } from "vitest";
import { emailSiteOf, emailTheme, oklchToHex } from "./email-theme";
import { resolveSiteConfig } from "@/features/config/config.resolve";

describe("oklchToHex", () => {
  it("converts reference colors", () => {
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
    expect(oklchToHex(0.627955, 0.257683, 29.233885)).toBe("#ff0000");
    expect(oklchToHex(0.452014, 0.313214, 264.052021)).toBe("#0000ff");
  });

  it("clamps colors outside sRGB", () => {
    expect(oklchToHex(0.7, 0.4, 145)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("emailTheme", () => {
  it("follows the site's primary hue", () => {
    expect(emailTheme(250).primary).toBe(oklchToHex(0.7, 0.14, 250));
    expect(emailTheme(30).primary).toBe(oklchToHex(0.7, 0.14, 30));
  });
});

describe("emailSiteOf", () => {
  it("takes the title and the shared primary hue from the site config", () => {
    expect(
      emailSiteOf({
        title: "我的博客",
        primaryHue: 120,
      }),
    ).toEqual({ title: "我的博客", primaryHue: 120 });
  });

  it("follows a hue still stored under the old theme location", () => {
    const site = resolveSiteConfig({
      site: { title: "我的博客", theme: { fuwari: { primaryHue: 30 } } },
    });
    expect(emailSiteOf(site)).toEqual({ title: "我的博客", primaryHue: 30 });
  });
});
