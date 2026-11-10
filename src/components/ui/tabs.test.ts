// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import { Tabs } from "./tabs";

afterEach(cleanup);

it("flags a marked tab with a named dot, and leaves the others plain", () => {
  render(
    createElement(Tabs, {
      "aria-label": "Settings",
      value: "site",
      onValueChange: () => {},
      items: [
        { value: "site", label: "Site", mark: "Unsaved changes" },
        { value: "notify", label: "Notifications" },
      ],
    }),
  );

  const marked = screen.getByRole("tab", { name: /^Site/ });
  expect(
    within(marked).getByRole("img", { name: "Unsaved changes" }),
  ).not.toBeNull();
  const plain = screen.getByRole("tab", { name: "Notifications" });
  expect(plain.querySelector(".fuwari-tab-mark")).toBeNull();
  // The mark is a dot, not text, so the label's own text is unchanged.
  expect(marked.textContent).toBe("Site");
});
