// @vitest-environment jsdom
import { cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME_RECIPE } from "@/features/theme/theme-recipe";
import { m } from "@/paraglide/messages";
import { COPYRIGHT, renderFooter } from "./test-utils";

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the footer", () => {
  it("is a caption outside a provider and under the default recipe", async () => {
    const bare = (await renderFooter()).innerHTML;
    cleanup();
    const caption = (await renderFooter({ form: "caption" })).innerHTML;

    expect(DEFAULT_THEME_RECIPE.footer).toBe("caption");
    expect(caption).toBe(bare);
    expect(bare).toContain(m.footer_powered_by());
  });

  it("is the form the recipe picks", async () => {
    const caption = await renderFooter({ form: "caption" });
    expect(caption.querySelector("footer")).toBeNull();
    cleanup();

    const band = await renderFooter({ form: "band" });
    expect(band.firstElementChild!.tagName).toBe("FOOTER");
    expect(band.textContent).not.toContain(m.footer_powered_by());
  });

  // The signature and the colophon end in one small print (small-print.tsx):
  // each places it, neither restyles it.
  it("ends the signature and the colophon in the same links and the same copyright", async () => {
    const smallPrint = async (form: "signature" | "colophon") => {
      const host = await renderFooter({ form });
      const links = within(host)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("target") === "_blank");
      const copyright = within(host).getByText(COPYRIGHT);
      const parts = {
        links: links.map((link) => link.outerHTML),
        linksInk: [...links[0]!.parentElement!.classList].filter((name) =>
          name.startsWith("fuwari-text-"),
        ),
        copyrightInk: [...copyright.classList].filter((name) =>
          name.startsWith("fuwari-text-"),
        ),
        copyrightSize: [...copyright.classList].filter((name) =>
          /^text-(xs|sm|base)$/.test(name),
        ),
      };
      cleanup();
      return parts;
    };

    const signature = await smallPrint("signature");
    const colophon = await smallPrint("colophon");

    expect(signature.links).toHaveLength(2);
    expect(colophon).toEqual(signature);
    expect(signature.copyrightInk).toEqual(["fuwari-text-50"]);
  });
});
