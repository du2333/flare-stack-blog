// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  AdminChromeProvider,
  useAdminChrome,
  useAdminPrimaryAction,
} from "./admin-chrome";
import { AdminPage } from "./admin-page";

afterEach(cleanup);

/** What the phone top bar would show. */
function TopBar() {
  const { primaryAction } = useAdminChrome();
  return createElement("output", null, primaryAction?.label ?? "none");
}

it("lays out the title, its count, the primary action, tabs, tools and the body", () => {
  const onClick = vi.fn();
  render(
    createElement(
      AdminChromeProvider,
      null,
      createElement(AdminPage, {
        title: "Posts",
        count: 41,
        description: "What the page is for",
        primaryAction: { label: "New post", onClick },
        actions: createElement("button", { type: "button" }, "Import"),
        tabs: createElement("div", { role: "tablist" }),
        tools: createElement("input", { "aria-label": "Search" }),
        body: "list",
        children: createElement("p", null, "rows"),
      }),
      createElement(TopBar),
    ),
  );
  const header = document.querySelector(".admin-page-header")!;
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Posts");
  expect(header.querySelector(".admin-page-count")?.textContent).toBe("41");
  const buttons = [...header.querySelectorAll("button")].map(
    (button) => button.textContent,
  );
  // Secondary actions sit left of the primary one.
  expect(buttons).toEqual(["Import", "New post"]);
  fireEvent.click(screen.getByRole("button", { name: "New post" }));
  expect(onClick).toHaveBeenCalledOnce();
  expect(screen.getByRole("status").textContent).toBe("New post");
  const toolbar = document.querySelector(
    ".admin-page-head .admin-page-toolbar",
  )!;
  expect(toolbar.querySelector('[role="tablist"]')).not.toBeNull();
  expect(toolbar.querySelector('input[aria-label="Search"]')).not.toBeNull();
  const body = document.querySelector(".admin-page-body")!;
  expect(body.getAttribute("data-form")).toBe("list");
  expect(body.hasAttribute("data-scroll")).toBe(true);
  expect(body.textContent).toBe("rows");
});

function Tab() {
  useAdminPrimaryAction({ label: "Create key", onClick: () => {} });
  return null;
}

function Shell() {
  const [tab, setTab] = useState(true);
  return createElement(AdminPage, {
    title: "Integrations",
    body: "form",
    scroll: false,
    children: [
      tab ? createElement(Tab, { key: "tab" }) : null,
      createElement(
        "button",
        { key: "leave", type: "button", onClick: () => setTab(false) },
        "leave",
      ),
    ],
  });
}

it("shows a primary action set from inside the body, and drops it when that part leaves", () => {
  render(
    createElement(
      AdminChromeProvider,
      null,
      createElement(Shell),
      createElement(TopBar),
    ),
  );
  expect(screen.getByRole("button", { name: "Create key" })).not.toBeNull();
  expect(
    document.querySelector(".admin-page-body")?.hasAttribute("data-scroll"),
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "leave" }));
  expect(screen.queryByRole("button", { name: "Create key" })).toBeNull();
  expect(screen.getByRole("status").textContent).toBe("none");
});
