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
  NavGroupOption,
  NavLinkOption,
  NavOption,
} from "@/components/layout/layout-props";
import {
  currentRowIndex,
  entryIcon,
  groupKeys,
  initialRailGroups,
  openGroupIds,
  reconcileRailGroups,
  toggleRailGroup,
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
function groupAt(id: string, label: string): NavGroupOption {
  return {
    id,
    label,
    children: [{ ...WITH_LINK, id: `${id}-0`, href: `/${label}` }],
  };
}
const WITH_LINK: NavLinkOption = {
  id: "link",
  label: "Link",
  href: "/link",
  external: false,
};

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

describe("the groups of the rail", () => {
  const open = (state: ReturnType<typeof initialRailGroups>) => [...state.open];

  it("start open when they hold the current link, and closed otherwise", () => {
    expect(open(initialRailGroups(WITH_GROUP, "/notes"))).toEqual([
      "Elsewhere",
    ]);
    expect(open(initialRailGroups(WITH_GROUP, "/notes/2024"))).toEqual([
      "Elsewhere",
    ]);
    expect(open(initialRailGroups(WITH_GROUP, "/posts"))).toEqual([]);
    expect(open(initialRailGroups(WITH_GROUP, "/search"))).toEqual([]);
    expect(open(initialRailGroups(NAV_OPTIONS, "/posts"))).toEqual([]);
  });

  it("do not count an external link of a group as the page", () => {
    expect(open(initialRailGroups(WITH_GROUP, "/code"))).toEqual([]);
  });

  it("are known by their names, and a second group of a name by its place among them", () => {
    const twice: Array<NavOption> = [
      { id: "custom-0", label: "More", children: [WITH_LINK] },
      { id: "custom-1", label: "Other", children: [WITH_LINK] },
      { id: "custom-2", label: "More", children: [WITH_LINK] },
    ];
    expect([...groupKeys(twice)]).toEqual([
      ["custom-0", "More"],
      ["custom-1", "Other"],
      ["custom-2", "More#2"],
    ]);
  });

  it("open when the current link comes to lie in one from outside", () => {
    const start = initialRailGroups(WITH_GROUP, "/posts");
    const entered = reconcileRailGroups(start, WITH_GROUP, "/notes");

    expect(open(entered)).toEqual(["Elsewhere"]);
    expect(entered.holder).toBe("Elsewhere");
  });

  it("keep what the reader chose while the current link stays in the group, and open again when it comes back", () => {
    let state = initialRailGroups(WITH_GROUP, "/notes");
    state = toggleRailGroup(state, "Elsewhere");
    expect(open(state)).toEqual([]);

    // From one link of the group to another: it stays closed.
    state = reconcileRailGroups(state, WITH_GROUP, "/notes/2");
    expect(open(state)).toEqual([]);

    // Out of the group, and in again: it opens.
    state = reconcileRailGroups(state, WITH_GROUP, "/posts");
    expect(open(state)).toEqual([]);
    state = reconcileRailGroups(state, WITH_GROUP, "/notes");
    expect(open(state)).toEqual(["Elsewhere"]);
  });

  it("keep a group the reader opened open, whatever page comes next", () => {
    let state = toggleRailGroup(
      initialRailGroups(WITH_GROUP, "/"),
      "Elsewhere",
    );
    state = reconcileRailGroups(state, WITH_GROUP, "/posts");
    state = reconcileRailGroups(state, WITH_GROUP, "/about");

    expect(open(state)).toEqual(["Elsewhere"]);
  });

  it("stay with their group when the navigation is reordered", () => {
    const before = [
      groupAt("custom-0", "First"),
      groupAt("custom-1", "Second"),
    ];
    let state = toggleRailGroup(initialRailGroups(before, "/"), "Second");

    // The ids are positions: "custom-0" is now the group that was "custom-1".
    const after = [groupAt("custom-0", "Second"), groupAt("custom-1", "First")];
    state = reconcileRailGroups(state, after, "/");

    expect(open(state)).toEqual(["Second"]);
    expect([...openGroupIds(after, state)]).toEqual(["custom-0"]);
    expect([...openGroupIds(before, state)]).toEqual(["custom-1"]);
  });

  it("drop the state of a group that is gone, and of no other", () => {
    const both = [groupAt("custom-0", "A"), groupAt("custom-1", "B")];
    let state = toggleRailGroup(initialRailGroups(both, "/"), "A");
    state = toggleRailGroup(state, "B");

    // A is removed: B moves up to "custom-0".
    state = reconcileRailGroups(state, [groupAt("custom-0", "B")], "/");
    expect(open(state)).toEqual(["B"]);

    // A new group of the removed name does not inherit anything.
    state = reconcileRailGroups(
      state,
      [groupAt("custom-0", "B"), groupAt("custom-1", "A")],
      "/",
    );
    expect(open(state)).toEqual(["B"]);
    expect(open(reconcileRailGroups(state, [], "/"))).toEqual([]);
  });

  it("open a group that newly holds the current link when the navigation changes", () => {
    const without: Array<NavOption> = [
      { id: "home", label: "Home", href: "/", external: false },
    ];
    const state = initialRailGroups(without, "/notes");
    expect(open(state)).toEqual([]);

    expect(open(reconcileRailGroups(state, WITH_GROUP, "/notes"))).toEqual([
      "Elsewhere",
    ]);
  });

  it("return the same state when nothing changes", () => {
    const state = initialRailGroups(WITH_GROUP, "/notes");

    expect(reconcileRailGroups(state, WITH_GROUP, "/notes")).toBe(state);
  });

  it("say what moved the pill last: a fold only until the page changes", () => {
    let state = initialRailGroups(WITH_GROUP, "/");
    expect(state.moved).toBe("page");

    state = toggleRailGroup(state, "Elsewhere");
    expect(state.moved).toBe("fold");
    expect(reconcileRailGroups(state, WITH_GROUP, "/").moved).toBe("fold");

    // Away and back to the page it was folded on: a page change, not a fold.
    state = reconcileRailGroups(state, WITH_GROUP, "/posts");
    expect(state.moved).toBe("page");
    state = reconcileRailGroups(state, WITH_GROUP, "/");
    expect(state.moved).toBe("page");
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
