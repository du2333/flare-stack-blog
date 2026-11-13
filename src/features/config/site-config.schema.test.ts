import { describe, expect, it } from "vitest";
import { m } from "@/paraglide/messages";
import { createSiteConfigInputFormSchema } from "./site-config.schema";

function parseLinks(navLinks: Array<Record<string, unknown>>) {
  return createSiteConfigInputFormSchema().safeParse({ navLinks });
}

function issuePaths(navLinks: Array<Record<string, unknown>>) {
  const result = parseLinks(navLinks);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
}

describe("the navigation links form", () => {
  it("submits a group as its links, without an address", () => {
    const result = parseLinks([
      { label: " About ", href: "/post/about" },
      {
        label: "Elsewhere",
        href: "/left-over",
        children: [{ label: " GitHub ", href: "github.com/du2333" }],
      },
      { label: "Plain", href: "/plain", children: [] },
    ]);
    expect(result.success && result.data.navLinks).toEqual([
      { label: "About", href: "/post/about" },
      {
        label: "Elsewhere",
        children: [{ label: "GitHub", href: "https://github.com/du2333" }],
      },
      { label: "Plain", href: "/plain" },
    ]);
  });

  it("checks each link of a group where it stands", () => {
    expect(
      issuePaths([
        {
          label: "",
          children: [
            { label: "", href: "/a" },
            { label: "B", href: "" },
            { label: "C", href: "nope" },
          ],
        },
      ]),
    ).toEqual([
      "navLinks.0.label",
      "navLinks.0.children.0.label",
      "navLinks.0.children.1.href",
      "navLinks.0.children.2.href",
    ]);
  });

  it("rejects a link with neither links nor an address, and too many links", () => {
    expect(issuePaths([{ label: "Nowhere", href: "", children: [] }])).toEqual([
      "navLinks.0.href",
    ]);
    expect(
      parseLinks([
        {
          label: "Many",
          children: Array.from({ length: 7 }, (_, index) => ({
            label: `C${index}`,
            href: "/c",
          })),
        },
      ]).success,
    ).toBe(false);
  });
});
