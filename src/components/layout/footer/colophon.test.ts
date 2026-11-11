// @vitest-environment jsdom
import { cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import {
  COPYRIGHT,
  linksTo,
  NAV_OPTIONS,
  opensInNewTab,
  renderFooter,
} from "./test-utils";

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the footer as a colophon", () => {
  it("is one footer: the feed and sitemap links, then the copyright", async () => {
    const host = await renderFooter({ form: "colophon" });
    const footer = host.firstElementChild!;

    expect(host.children).toHaveLength(1);
    expect(footer.tagName).toBe("FOOTER");
    expect(footer.children).toHaveLength(2);
    expect(host.textContent).toBe(`RSSSitemap${COPYRIGHT}`);
    expect(within(host).getByText(COPYRIGHT).tagName).toBe("P");
    expect(footer.lastElementChild).toBe(within(host).getByText(COPYRIGHT));
  });

  it("names each link after an icon that says nothing, and opens it in a new tab", async () => {
    const host = await renderFooter({ form: "colophon" });
    const links = within(host).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/rss.xml",
      "/sitemap.xml",
    ]);
    expect(links.map((link) => link.textContent)).toEqual(["RSS", "Sitemap"]);
    expect(linksTo(host, "/rss.xml")).toHaveLength(1);
    expect(linksTo(host, "/sitemap.xml")).toHaveLength(1);
    for (const link of links) {
      expect(opensInNewTab(link)).toBe(true);
      const icon = link.firstElementChild!;
      expect(icon.tagName.toLowerCase()).toBe("svg");
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
  });

  // Whoever picks it shows these in its frame, on every page.
  it("names nobody: no brand, no tagline or description, no social links, no navigation and no credit", async () => {
    const host = await renderFooter({ form: "colophon" });

    expect(within(host).queryByRole("navigation")).toBeNull();
    for (const option of NAV_OPTIONS) {
      expect(within(host).queryByText(option.label)).toBeNull();
    }
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).not.toContain("Engine Notes");
    expect(host.textContent).not.toContain("Slow and exact");
    expect(host.textContent).not.toContain("Notes on engines.");
    expect(linksTo(host, "https://github.com/ada")).toEqual([]);
    expect(linksTo(host, "/")).toEqual([]);
    expect(host.textContent).not.toContain(m.footer_powered_by());
    expect(host.textContent).not.toContain("Tanstack Start");
    expect(host.textContent).not.toContain("Flare Stack Blog");
  });

  // One line where it fits; where it does not, the copyright wraps under
  // the links and both start at the same edge. No breakpoint decides it:
  // the place a shell gives the footer may be narrow in a wide window.
  it("is one line that wraps by itself, at whatever width its place has", async () => {
    const host = await renderFooter({ form: "colophon" });
    const classes = [...host.firstElementChild!.classList];

    expect(classes).toEqual(
      expect.arrayContaining(["flex", "flex-wrap", "justify-between"]),
    );
    expect(
      classes.filter((name) =>
        /^(max-)?(sm|md|lg|xl):(flex|justify|items)-/.test(name),
      ),
    ).toEqual([]);
  });

  it("is the same whatever the page and the navigation entries", async () => {
    const home = (await renderFooter({ form: "colophon" })).innerHTML;
    cleanup();
    const elsewhere = (
      await renderFooter({ form: "colophon", path: "/posts", navOptions: [] })
    ).innerHTML;

    expect(elsewhere).toBe(home);
  });
});
