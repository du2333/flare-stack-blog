import { describe, expect, it } from "vitest";
import {
  canonicalizeNavHref,
  isExternalNavHref,
  isNavHref,
  isNavLinkGroup,
  NAV_LINK_CHILDREN_MAX,
  normalizeNavLinks,
} from "./nav-links";

describe("nav href", () => {
  it("treats http(s) as external and root paths as internal", () => {
    expect(isExternalNavHref("https://github.com/du2333")).toBe(true);
    expect(isExternalNavHref("/post/about")).toBe(false);
    expect(isNavHref("/post/about")).toBe(true);
    expect(isNavHref("//evil.example")).toBe(false);
    expect(isNavHref("javascript:alert(1)")).toBe(false);
  });

  it("fills https for host-like addresses", () => {
    expect(canonicalizeNavHref("github.com/du2333")).toBe(
      "https://github.com/du2333",
    );
    expect(canonicalizeNavHref("/post/about")).toBe("/post/about");
    expect(canonicalizeNavHref("about")).toBe("about");
  });

  it("normalizes stored nav links", () => {
    expect(
      normalizeNavLinks([
        { label: "  About ", href: " /post/about " },
        { label: "GitHub", href: "github.com/du2333" },
        { label: "Nope", href: "ftp://example.com" },
      ]),
    ).toEqual([
      { label: "About", href: "/post/about" },
      { label: "GitHub", href: "https://github.com/du2333" },
    ]);
  });
});

describe("nav link groups", () => {
  const child = (index: number) => ({ label: `C${index}`, href: `/c${index}` });

  it("reads an entry with links as a group and drops its own address", () => {
    const links = normalizeNavLinks([
      {
        label: " Elsewhere ",
        href: "/ignored",
        children: [
          { label: "GitHub", href: "github.com/du2333" },
          { label: "Bad", href: "javascript:alert(1)" },
          { label: "", href: "/nameless" },
          { label: "Tags", href: "/tags" },
        ],
      },
    ]);
    expect(links).toEqual([
      {
        label: "Elsewhere",
        children: [
          { label: "GitHub", href: "https://github.com/du2333" },
          { label: "Tags", href: "/tags" },
        ],
      },
    ]);
    expect(isNavLinkGroup(links[0]!)).toBe(true);
  });

  it("keeps a group's first six links and none of what they nest", () => {
    const [group] = normalizeNavLinks([
      {
        label: "Many",
        children: [
          { ...child(0), children: [child(9)] },
          ...Array.from({ length: 7 }, (_, index) => child(index + 1)),
        ],
      },
    ]);
    expect(group).toEqual({
      label: "Many",
      children: Array.from({ length: NAV_LINK_CHILDREN_MAX }, (_, index) =>
        child(index),
      ),
    });
  });

  it("reads an entry whose links are all unusable by its own address", () => {
    expect(
      normalizeNavLinks([
        { label: "Link", href: "/a", children: [{ label: "", href: "" }] },
        { label: "Empty", href: "/b", children: [] },
        { label: "Nothing", children: [] },
        { label: "", children: [child(1)] },
      ]),
    ).toEqual([
      { label: "Link", href: "/a" },
      { label: "Empty", href: "/b" },
    ]);
  });

  it("counts a group as one of the five entries", () => {
    const links = normalizeNavLinks([
      { label: "G", children: [child(1), child(2)] },
      ...Array.from({ length: 5 }, (_, index) => child(index + 3)),
    ]);
    expect(links).toHaveLength(5);
    expect(links.filter(isNavLinkGroup)).toHaveLength(1);
  });
});
