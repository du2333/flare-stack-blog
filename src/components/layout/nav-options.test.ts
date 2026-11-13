import { describe, expect, it } from "vitest";
import type {
  NavGroupOption,
  NavOption,
} from "@/components/layout/layout-props";
import {
  currentNavLink,
  customNavOptions,
  flattenNavOptions,
  isNavGroup,
  isNavOptionCurrent,
} from "./nav-options";

const link = (id: string, href: string, external = false): NavOption => ({
  id,
  label: id,
  href,
  external,
});

const GROUP: NavGroupOption = {
  id: "custom-1",
  label: "Group",
  children: [
    { id: "custom-1-0", label: "About", href: "/post/about", external: false },
    {
      id: "custom-1-1",
      label: "GitHub",
      href: "https://github.com/du2333",
      external: true,
    },
  ],
};

describe("customNavOptions", () => {
  it("gives a link and a group their entries, the group's links numbered within it", () => {
    expect(
      customNavOptions([
        { label: "Tags", href: "/tags" },
        {
          label: "Group",
          children: [
            { label: "About", href: "/post/about" },
            { label: "GitHub", href: "https://github.com/du2333" },
          ],
        },
      ]),
    ).toEqual([
      { id: "custom-0", label: "Tags", href: "/tags", external: false },
      GROUP,
    ]);
  });
});

describe("flattenNavOptions", () => {
  it("puts each group's links in its place, in order", () => {
    const options = [link("home", "/"), GROUP, link("tags", "/tags")];
    expect(flattenNavOptions(options).map((option) => option.id)).toEqual([
      "home",
      "custom-1-0",
      "custom-1-1",
      "tags",
    ]);
    expect(flattenNavOptions(options).some(isNavGroup)).toBe(false);
  });

  it("leaves a list without groups as it is", () => {
    const options = [link("home", "/"), link("posts", "/posts")];
    expect(flattenNavOptions(options)).toEqual(options);
  });
});

describe("currentNavLink", () => {
  const HOME = link("home", "/");
  const POSTS = link("posts", "/posts");
  const current = (pathname: string, options: Array<NavOption>) =>
    currentNavLink(options, pathname)?.id ?? null;

  it("finds the link on its page and the pages under it, home on the home page only", () => {
    const options = [HOME, POSTS];
    expect(current("/", options)).toBe("home");
    expect(current("/posts/", options)).toBe("posts");
    expect(current("/posts/2", options)).toBe("posts");
    expect(current("/postscript", options)).toBeNull();
    expect(current("/moments", options)).toBeNull();
  });

  it("lets the longest address win, inside a group too", () => {
    const nested: NavGroupOption = {
      id: "custom-0",
      label: "Group",
      children: [
        { id: "custom-0-0", label: "x", href: "/posts/x", external: false },
      ],
    };
    const options = [HOME, POSTS, nested];
    expect(current("/posts/x", options)).toBe("custom-0-0");
    expect(current("/posts/y", options)).toBe("posts");
  });

  it("puts a Post no link points at under the Post list", () => {
    expect(current("/post/hello", [HOME, POSTS])).toBe("posts");
    expect(current("/post/about", [HOME, POSTS, GROUP])).toBe("custom-1-0");
  });

  it("compares decoded paths without the query or hash", () => {
    const post = link("post", "/post/用-api?ref=nav#top");
    expect(current("/post/%E7%94%A8-api", [post])).toBe("post");
    expect(current("/post/用-api", [post])).toBe("post");
  });

  it("never finds an external link", () => {
    expect(current("/", [link("out", "https://example.com/", true)])).toBe(
      null,
    );
  });
});

describe("isNavOptionCurrent", () => {
  const options = [link("posts", "/posts"), GROUP];

  it("marks one link at most, and the group that holds it", () => {
    const about = currentNavLink(options, "/post/about");
    expect(options.map((option) => isNavOptionCurrent(option, about))).toEqual([
      false,
      true,
    ]);
    expect(
      GROUP.children.map((child) => isNavOptionCurrent(child, about)),
    ).toEqual([true, false]);

    const posts = currentNavLink(options, "/posts");
    expect(options.map((option) => isNavOptionCurrent(option, posts))).toEqual([
      true,
      false,
    ]);
  });

  it("marks nothing where no link is current", () => {
    expect(isNavOptionCurrent(GROUP, null)).toBe(false);
  });
});
