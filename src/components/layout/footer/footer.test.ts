// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME_RECIPE } from "@/features/theme/theme-recipe";
import { m } from "@/paraglide/messages";
import { renderFooter } from "./test-utils";

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
});
