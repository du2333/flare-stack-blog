// @vitest-environment jsdom
import { cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import { m } from "@/paraglide/messages";
import {
  COPYRIGHT,
  linksTo,
  NAV_OPTIONS,
  opensInNewTab,
  renderFooter,
  SITE,
} from "./test-utils";

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** The link home that carries the site title. */
function brandLink(host: HTMLElement) {
  return within(host).getByRole("link", { name: "Engine Notes" });
}

describe("the footer as a band", () => {
  it("is one footer with a navigation of its own name", async () => {
    const host = await renderFooter({ form: "band" });

    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild!.tagName).toBe("FOOTER");
    expect(within(host).getAllByRole("navigation")).toHaveLength(1);
    expect(
      within(host).getByRole("navigation", { name: m.footer_nav_label() }),
    ).toBeTruthy();
  });

  it("lists every navigation entry it is given, in the given order", async () => {
    const host = await renderFooter({ form: "band" });
    const nav = within(host).getByRole("navigation");
    const links = within(nav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(
      NAV_OPTIONS.map((option) => option.label),
    );
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      NAV_OPTIONS.map((option) => option.href),
    );
  });

  it("lists a group's links in its place, and not the group", async () => {
    const host = await renderFooter({
      form: "band",
      navOptions: [
        NAV_OPTIONS[0]!,
        {
          id: "custom-0",
          label: "Nav group",
          children: [
            {
              id: "custom-0-0",
              label: "Nav one",
              href: "/one",
              external: false,
            },
            {
              id: "custom-0-1",
              label: "Nav two",
              href: "https://example.com/two",
              external: true,
            },
          ],
        },
        NAV_OPTIONS[1]!,
      ],
    });
    const nav = within(host).getByRole("navigation");

    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Nav home", "Nav one", "Nav two", "Nav posts"]);
    expect(nav.textContent).not.toContain("Nav group");
    expect(
      opensInNewTab(within(nav).getByRole("link", { name: "Nav two" })),
    ).toBe(true);
  });

  it("opens an external entry in a new tab, under the mark the navbar gives it", async () => {
    const host = await renderFooter({ form: "band" });
    const nav = within(host).getByRole("navigation");

    for (const option of NAV_OPTIONS) {
      const link = within(nav).getByRole("link", { name: option.label });
      expect(opensInNewTab(link)).toBe(option.external);
      expect(link.querySelector("svg") !== null).toBe(option.external);
    }
  });

  it("marks the entry of the current page", async () => {
    const host = await renderFooter({ form: "band", path: "/posts" });
    const nav = within(host).getByRole("navigation");

    expect(
      within(nav)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page")
        .map((link) => link.textContent),
    ).toEqual(["Nav posts"]);
  });

  it("has the feed and sitemap links on one line with the copyright, and no credit", async () => {
    const host = await renderFooter({ form: "band" });
    const [rss] = linksTo(host, "/rss.xml");
    const [sitemap] = linksTo(host, "/sitemap.xml");

    expect(linksTo(host, "/rss.xml")).toHaveLength(1);
    expect(linksTo(host, "/sitemap.xml")).toHaveLength(1);
    expect(rss.textContent).toBe("RSS");
    expect(sitemap.textContent).toBe("Sitemap");
    expect(opensInNewTab(rss)).toBe(true);
    expect(opensInNewTab(sitemap)).toBe(true);

    const line = within(host).getByText(COPYRIGHT).parentElement!;
    expect(line.contains(rss)).toBe(true);
    expect(line.contains(sitemap)).toBe(true);
    // They are not navigation entries.
    expect(within(host).getByRole("navigation").contains(rss)).toBe(false);
    // At every width the copyright is at one end of the line and the links
    // at the other: no corner is kept clear for back to top, which the
    // shell that picks the band rests above it.
    expect([...line.classList]).toContain("justify-between");
    expect(
      [...line.classList].filter((name) => /^(max-)?(sm|md|lg|xl):/.test(name)),
    ).toEqual([]);

    expect(host.textContent).not.toContain(m.footer_powered_by());
    expect(host.textContent).not.toContain("Tanstack Start");
    expect(host.textContent).not.toContain("Flare Stack Blog");
  });

  it("signs off with the site title as a link home, the tagline and the social links", async () => {
    const host = await renderFooter({ form: "band" });

    expect(brandLink(host).getAttribute("href")).toBe("/");
    expect(within(host).getByText("Slow and exact").tagName).toBe("P");
    expect(within(host).queryByText("Notes on engines.")).toBeNull();
    const [github] = linksTo(host, "https://github.com/ada");
    expect(github.getAttribute("aria-label")).toBe("GitHub");
    // The sign-off stands before the navigation.
    expect(
      brandLink(host).compareDocumentPosition(
        within(host).getByRole("navigation"),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the site description where no tagline is set", async () => {
    const host = await renderFooter({
      form: "band",
      site: { ...SITE, tagline: "" },
    });

    expect(within(host).getByText("Notes on engines.").tagName).toBe("P");
  });

  it("leaves no gap for a line or for social links the site does not have", async () => {
    const full = await renderFooter({ form: "band" });
    const signOff = (host: HTMLElement) => brandLink(host).parentElement!;
    expect(signOff(full).children).toHaveLength(3);
    cleanup();

    const bare = await renderFooter({
      form: "band",
      site: { ...SITE, tagline: "", description: "", social: [] },
    });
    expect(signOff(bare).children).toHaveLength(1);
    expect(signOff(bare).firstElementChild).toBe(brandLink(bare));
    cleanup();

    // A social link without an address is not shown either.
    const unset = await renderFooter({
      form: "band",
      site: { ...SITE, social: [{ platform: "github", url: "" }] },
    });
    expect(signOff(unset).children).toHaveLength(2);
  });

  describe("brand mark", () => {
    const mark = (host: HTMLElement) =>
      brandLink(host).querySelector<HTMLElement>("[data-mark]");

    it("default: the built-in icon as a seal", async () => {
      const host = await renderFooter({ form: "band" });

      expect(mark(host)!.dataset.mark).toBe("default");
      expect(mark(host)!.querySelector("svg")).not.toBeNull();
      expect(brandLink(host).querySelector("img")).toBeNull();
    });

    it("siteIcon: the site icon, which the title beside it already names", async () => {
      const site = { ...SITE, brandMark: "siteIcon" } as const;
      const host = await renderFooter({ form: "band", site });

      expect(mark(host)!.tagName).toBe("IMG");
      expect(mark(host)!.dataset.mark).toBe("siteIcon");
      expect(mark(host)!.getAttribute("src")).toBe(
        resolveSiteConfig({ site }).icons.faviconSvg,
      );
      expect(mark(host)!.getAttribute("alt")).toBe("");
    });

    it("avatar: the avatar, at the size of a mark", async () => {
      const host = await renderFooter({
        form: "band",
        site: { ...SITE, brandMark: "avatar" },
      });

      expect(mark(host)!.tagName).toBe("IMG");
      expect(mark(host)!.dataset.mark).toBe("avatar");
      expect(mark(host)!.getAttribute("src")).toContain("avatar");
      expect(mark(host)!.getAttribute("alt")).toBe("");
      expect(mark(host)!.getAttribute("width")).toBe("32");
      expect(mark(host)!.getAttribute("height")).toBe("32");
    });

    it("none: the title alone, with no slot before it", async () => {
      const host = await renderFooter({
        form: "band",
        site: { ...SITE, brandMark: "none" },
      });

      expect(mark(host)).toBeNull();
      expect(brandLink(host).children).toHaveLength(1);
      expect(brandLink(host).textContent).toBe("Engine Notes");
    });
  });
});
