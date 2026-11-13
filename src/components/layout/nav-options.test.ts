import { describe, expect, it } from "vitest";
import type { NavOption } from "@/components/layout/layout-props";
import {
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

const GROUP: NavOption = {
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

describe("isNavOptionCurrent", () => {
  it("marks a link on its page and the pages under it, home on the home page only", () => {
    expect(isNavOptionCurrent(link("home", "/"), "/")).toBe(true);
    expect(isNavOptionCurrent(link("home", "/"), "/posts")).toBe(false);
    expect(isNavOptionCurrent(link("posts", "/posts"), "/posts/")).toBe(true);
    expect(isNavOptionCurrent(link("posts", "/posts"), "/posts/2")).toBe(true);
    expect(isNavOptionCurrent(link("posts", "/posts"), "/postscript")).toBe(
      false,
    );
  });

  it("compares decoded paths without the query or hash", () => {
    const post = link("post", "/post/用-api?ref=nav#top");
    expect(isNavOptionCurrent(post, "/post/%E7%94%A8-api")).toBe(true);
    expect(isNavOptionCurrent(post, "/post/用-api")).toBe(true);
  });

  it("never marks an external link", () => {
    expect(
      isNavOptionCurrent(link("out", "https://example.com/", true), "/"),
    ).toBe(false);
  });

  it("marks a group while one of its links is the page", () => {
    expect(isNavOptionCurrent(GROUP, "/post/about")).toBe(true);
    expect(isNavOptionCurrent(GROUP, "/posts")).toBe(false);
  });
});
