// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import { ThemePreviewBar } from "./theme-preview-bar";

afterEach(cleanup);

it("names the previewed Theme and leaves the preview", () => {
  const onExit = vi.fn();
  render(createElement(ThemePreviewBar, { themeName: "Fixture", onExit }));

  const bar = screen.getByRole("complementary", {
    name: m.theme_preview_bar_label(),
  });
  expect(bar.textContent).toContain(m.theme_preview_bar({ name: "Fixture" }));
  fireEvent.click(screen.getByRole("button", { name: m.theme_preview_exit() }));
  expect(onExit).toHaveBeenCalledOnce();
});
