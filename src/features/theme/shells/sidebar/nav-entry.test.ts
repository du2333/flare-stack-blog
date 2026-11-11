import {
  BookOpen,
  Compass,
  FileText,
  Globe,
  Home,
  Link2,
  MessageCircle,
} from "lucide-react";
import { describe, expect, it } from "vitest";
import type { NavOption } from "@/components/layout/layout-props";
import { currentEntryIndex, entryIcon } from "./nav-entry";

/** Shaped like the host's list: the built-in entries, then the custom links. */
const NAV_OPTIONS: Array<NavOption> = [
  { id: "home", label: "Home", href: "/", external: false },
  { id: "posts", label: "Posts", href: "/posts", external: false },
  { id: "moments", label: "Moments", href: "/moments", external: false },
  {
    id: "friend-links",
    label: "Friends",
    href: "/friend-links",
    external: false,
  },
  { id: "custom-0", label: "Guide", href: "/post/guide", external: false },
  { id: "custom-1", label: "About", href: "/about/", external: false },
  {
    id: "custom-2",
    label: "Elsewhere",
    href: "https://example.com/posts",
    external: true,
  },
];

function current(pathname: string, navOptions = NAV_OPTIONS) {
  const index = currentEntryIndex(navOptions, pathname);
  return index < 0 ? null : navOptions[index]!.label;
}

describe("the current entry of the navigation", () => {
  it("is the entry whose address the page has", () => {
    expect(current("/")).toBe("Home");
    expect(current("/posts")).toBe("Posts");
    expect(current("/moments")).toBe("Moments");
    expect(current("/friend-links")).toBe("Friends");
  });

  it("is the entry that leads to the page, but the home entry only on the home page", () => {
    expect(current("/posts/page/2")).toBe("Posts");
    expect(current("/postscript")).toBeNull();
    expect(current("/search")).toBeNull();
    expect(current("/login")).toBeNull();
  });

  it("reads an address without its trailing slash, query and hash, and decoded", () => {
    expect(current("/posts/")).toBe("Posts");
    expect(current("/about")).toBe("About");
    expect(
      current("/post/%E4%BD%A0%E5%A5%BD", [
        {
          id: "custom-0",
          label: "Hello",
          href: "/post/你好?from=nav#top",
          external: false,
        },
      ]),
    ).toBe("Hello");
    // A path that is no valid encoding is compared as it is written.
    expect(current("/post/%E4%A", NAV_OPTIONS)).toBe("Posts");
  });

  it("is the custom link to a Post on that Post, and the Post list on any other", () => {
    expect(current("/post/guide")).toBe("Guide");
    expect(current("/post/another")).toBe("Posts");
  });

  it("is none on a Post where the navigation has no Post list", () => {
    expect(
      current("/post/another", [NAV_OPTIONS[0]!, NAV_OPTIONS[2]!]),
    ).toBeNull();
  });

  it("is never an external entry, whatever its path", () => {
    expect(current("/posts", [NAV_OPTIONS[0]!, NAV_OPTIONS[6]!])).toBeNull();
  });
});

describe("the icon of an entry", () => {
  it("is its own for each built-in entry", () => {
    expect(NAV_OPTIONS.slice(0, 4).map(entryIcon)).toEqual([
      Home,
      BookOpen,
      MessageCircle,
      Link2,
    ]);
  });

  it("says where a custom link leads: a Post, another site, or elsewhere on this one", () => {
    expect(NAV_OPTIONS.slice(4).map(entryIcon)).toEqual([
      FileText,
      Compass,
      Globe,
    ]);
  });
});
