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

/** The two ends of the signature: who signs, and the links over the copyright. */
function ends(host: HTMLElement) {
  const footer = host.querySelector("footer")!;
  expect(footer.children).toHaveLength(2);
  return [...footer.children] as [HTMLElement, HTMLElement];
}

describe("the footer as a signature", () => {
  it("is one footer, with no navigation of its own", async () => {
    const host = await renderFooter({ form: "signature" });

    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild!.tagName).toBe("FOOTER");
    expect(within(host).queryByRole("navigation")).toBeNull();
  });

  it("signs with the author's name over the tagline at one end", async () => {
    const host = await renderFooter({ form: "signature" });
    const [signature] = ends(host);
    const name = within(signature).getByRole("link", { name: "Ada" });

    expect(name.getAttribute("href")).toBe("/");
    expect(opensInNewTab(name)).toBe(false);
    // In the heading face, which is the Theme's.
    expect(name.classList.contains("fuwari-heading")).toBe(true);
    expect(signature.textContent).toBe("AdaSlow and exact");
  });

  it("has the feed and sitemap links, each under an icon, over the copyright at the other end", async () => {
    const host = await renderFooter({ form: "signature" });
    const [, close] = ends(host);
    const links = within(close).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(["RSS", "Sitemap"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/rss.xml",
      "/sitemap.xml",
    ]);
    expect(links.every(opensInNewTab)).toBe(true);
    for (const link of links) {
      const icons = link.querySelectorAll("svg");
      expect(icons).toHaveLength(1);
      expect(icons[0]!.getAttribute("aria-hidden")).toBe("true");
    }
    // The links stand before the copyright, which is the last line.
    expect(close.lastElementChild!.textContent).toBe(COPYRIGHT);
    expect(close.textContent).toBe(`RSSSitemap${COPYRIGHT}`);
  });

  it("shows nothing else: three links, no brand mark, no social links, no credit", async () => {
    const host = await renderFooter({ form: "signature" });

    expect(host.textContent).toBe(`AdaSlow and exactRSSSitemap${COPYRIGHT}`);
    expect(
      within(host)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/", "/rss.xml", "/sitemap.xml"]);
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).not.toContain("Engine Notes");
    expect(host.textContent).not.toContain(m.footer_powered_by());
    expect(linksTo(host, "https://github.com/ada")).toEqual([]);
  });

  it("lists no navigation entry, whatever it is given", async () => {
    const host = await renderFooter({ form: "signature" });

    for (const option of NAV_OPTIONS) {
      expect(host.textContent).not.toContain(option.label);
    }
    expect(linksTo(host, "/posts")).toEqual([]);
    expect(linksTo(host, "https://example.com/")).toEqual([]);
  });

  it("puts the site description under the name when no tagline is set", async () => {
    const host = await renderFooter({
      form: "signature",
      site: { ...SITE, tagline: "" },
    });
    const [signature] = ends(host);

    expect(signature.textContent).toBe("AdaNotes on engines.");
    expect(signature.querySelectorAll("p")).toHaveLength(1);
  });

  it("has the name alone when the site has neither a tagline nor a description", async () => {
    const host = await renderFooter({
      form: "signature",
      site: { ...SITE, tagline: "", description: "" },
    });
    const [signature] = ends(host);

    expect(signature.textContent).toBe("Ada");
    expect(signature.querySelector("p")).toBeNull();
  });

  // What it shows does not depend on the page, so it is as tall on each.
  it("shows the same on every page", async () => {
    const shown = (host: HTMLElement) => ({
      text: host.textContent,
      elements: [...host.querySelectorAll("*")].map(
        (element) => element.tagName,
      ),
    });
    const home = shown(await renderFooter({ form: "signature" }));
    cleanup();
    const posts = shown(
      await renderFooter({ form: "signature", path: "/posts" }),
    );

    expect(posts).toEqual(home);
  });

  it("signs for the default site too", async () => {
    const site = resolveSiteConfig({});
    const host = await renderFooter({ form: "signature", site: {} });
    const [signature] = ends(host);

    expect(
      within(signature).getByRole("link", { name: site.author }),
    ).toBeTruthy();
    expect(signature.textContent).toBe(
      site.author + (site.tagline || site.description),
    );
  });
});
