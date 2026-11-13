// @vitest-environment jsdom
import { cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import { COPYRIGHT, opensInNewTab, renderFooter } from "./test-utils";

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the footer as a caption", () => {
  it("shows the copyright, the feed and sitemap links and the credit, and nothing else", async () => {
    const host = await renderFooter({ form: "caption" });

    expect(host.textContent).toBe(
      `${COPYRIGHT} / RSS / Sitemap${m.footer_powered_by()} Tanstack Start & Flare Stack Blog`,
    );
    const links = within(host).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/rss.xml",
      "/sitemap.xml",
      "https://tanstack.com/start",
      "https://github.com/du2333/flare-stack-blog",
    ]);
    expect(links.every(opensInNewTab)).toBe(true);
    // No band, no navigation, no brand: a rule, then the caption.
    expect(host.querySelector("footer, nav, img, svg")).toBeNull();
    expect(host.children).toHaveLength(2);
    expect(host.firstElementChild!.childNodes).toHaveLength(0);
  });
});
