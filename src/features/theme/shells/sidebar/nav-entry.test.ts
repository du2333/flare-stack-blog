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
import type {
  NavLinkOption,
  NavOption,
} from "@/components/layout/layout-props";
import {
  currentRowIndex,
  defaultOpenGroups,
  entryIcon,
  visibleRows,
} from "./nav-entry";

/** Shaped like the host's list: the built-in entries, then the custom links. */
const NAV_OPTIONS: Array<NavLinkOption> = [
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

const NONE = new Set<string>();

function current(pathname: string, navOptions: Array<NavOption> = NAV_OPTIONS) {
  const index = currentRowIndex(navOptions, NONE, pathname);
  return index < 0 ? null : visibleRows(navOptions, NONE)[index]!.label;
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

/** The built-in entries, then a group of two links between two custom links. */
const WITH_GROUP: Array<NavOption> = [
  { id: "home", label: "Home", href: "/", external: false },
  { id: "posts", label: "Posts", href: "/posts", external: false },
  {
    id: "custom-0",
    label: "Elsewhere",
    children: [
      { id: "custom-0-0", label: "Notes", href: "/notes", external: false },
      {
        id: "custom-0-1",
        label: "Code",
        href: "https://example.com/code",
        external: true,
      },
    ],
  },
  { id: "custom-1", label: "About", href: "/about", external: false },
];
const OPEN = new Set(["custom-0"]);

function labels(rows: Array<NavOption>) {
  return rows.map((row) => row.label);
}
function rowLabel(pathname: string, open: Set<string>) {
  const index = currentRowIndex(WITH_GROUP, open, pathname);
  return index < 0 ? null : visibleRows(WITH_GROUP, open)[index]!.label;
}

describe("the rows on show", () => {
  it("are the entries, with a group's links under it only while it is open", () => {
    expect(labels(visibleRows(WITH_GROUP, NONE))).toEqual([
      "Home",
      "Posts",
      "Elsewhere",
      "About",
    ]);
    expect(labels(visibleRows(WITH_GROUP, OPEN))).toEqual([
      "Home",
      "Posts",
      "Elsewhere",
      "Notes",
      "Code",
      "About",
    ]);
  });
});

describe("the groups that start open", () => {
  it("are the ones that hold the current link", () => {
    expect([...defaultOpenGroups(WITH_GROUP, "/notes")]).toEqual(["custom-0"]);
    expect([...defaultOpenGroups(WITH_GROUP, "/notes/2024")]).toEqual([
      "custom-0",
    ]);
  });

  it("are none on a page of another entry, on one that belongs to none, or without a group", () => {
    expect(defaultOpenGroups(WITH_GROUP, "/posts").size).toBe(0);
    expect(defaultOpenGroups(WITH_GROUP, "/search").size).toBe(0);
    expect(defaultOpenGroups(NAV_OPTIONS, "/posts").size).toBe(0);
  });

  it("do not count an external link of a group as the page", () => {
    expect(defaultOpenGroups(WITH_GROUP, "/code").size).toBe(0);
  });
});

describe("the row the pill stands on", () => {
  it("is the place of the current entry among the rows on show, and is -1 when the page belongs to none", () => {
    expect(currentRowIndex(WITH_GROUP, NONE, "/")).toBe(0);
    expect(currentRowIndex(WITH_GROUP, NONE, "/posts")).toBe(1);
    expect(currentRowIndex(WITH_GROUP, NONE, "/about")).toBe(3);
    expect(currentRowIndex(WITH_GROUP, NONE, "/search")).toBe(-1);
  });

  it("is the current link's own row while its group is open", () => {
    expect(rowLabel("/notes", OPEN)).toBe("Notes");
    expect(currentRowIndex(WITH_GROUP, OPEN, "/notes")).toBe(3);
  });

  it("is the group's row while the group is closed and holds the current link", () => {
    expect(rowLabel("/notes", NONE)).toBe("Elsewhere");
    expect(currentRowIndex(WITH_GROUP, NONE, "/notes")).toBe(2);
  });

  it("moves down the rows an open group adds above an entry that follows it", () => {
    expect(currentRowIndex(WITH_GROUP, NONE, "/about")).toBe(3);
    expect(currentRowIndex(WITH_GROUP, OPEN, "/about")).toBe(5);
    // And not for an entry above the group.
    expect(currentRowIndex(WITH_GROUP, OPEN, "/posts")).toBe(1);
  });

  it("is never the row of a group that holds no current link", () => {
    expect(rowLabel("/posts", NONE)).toBe("Posts");
    expect(rowLabel("/code", NONE)).toBeNull();
  });
});
