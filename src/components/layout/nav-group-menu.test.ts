// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createElement } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NavGroupOption } from "@/components/layout/layout-props";
import {
  MENU_HOVER_CLOSE_DELAY,
  MENU_HOVER_OPEN_DELAY,
} from "@/components/ui/menu";
import { NavGroupMenu } from "./nav-group-menu";

// Unmount the menu as soon as it closes; exit motion is not under test.
vi.mock("@/hooks/use-motion", () => ({
  MOTION: { popover: 120 },
  useMotionPresence: (open: boolean) => open,
}));

const GROUP: NavGroupOption = {
  id: "custom-0",
  label: "Elsewhere",
  children: [
    { id: "custom-0-0", label: "About", href: "/post/about", external: false },
    { id: "custom-0-1", label: "Tags", href: "/tags", external: false },
    {
      id: "custom-0-2",
      label: "GitHub",
      href: "https://github.com/du2333",
      external: true,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function renderGroup(path = "/") {
  const root = createRootRoute({
    component: () =>
      createElement(
        "nav",
        null,
        createElement(NavGroupMenu, {
          group: GROUP,
          className: "entry",
          activeClassName: "entry-current",
        }),
        createElement("a", { href: "/after" }, "After"),
      ),
    notFoundComponent: () => null,
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });
  return screen.findByRole("button", { name: "Elsewhere" });
}

function menuLinks() {
  return screen.queryAllByRole("menuitem");
}

describe("NavGroupMenu", () => {
  it("is a button that leads nowhere, closed at first", async () => {
    const trigger = await renderGroup();

    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.className).toContain("entry");
    expect(screen.queryByRole("link", { name: "Elsewhere" })).toBeNull();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens its links on a click and closes on the next", async () => {
    const trigger = await renderGroup();

    fireEvent.click(trigger);
    const menu = await findInPopover("menu", { name: "Elsewhere" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(menuLinks().map((item) => item.textContent)).toEqual([
      "About",
      "Tags",
      "GitHub",
    ]);
    expect(menuLinks().every((item) => item.tagName === "A")).toBe(true);
    const github = screen.getByRole("menuitem", { name: "GitHub" });
    expect(github.getAttribute("href")).toBe("https://github.com/du2333");
    expect(github.getAttribute("target")).toBe("_blank");
    expect(
      screen.getByRole("menuitem", { name: "Tags" }).getAttribute("target"),
    ).toBeNull();

    fireEvent.click(trigger);
    expect(menu.isConnected).toBe(false);
  });

  it("closes once a link is followed", async () => {
    const trigger = await renderGroup();
    fireEvent.click(trigger);
    const menu = await findInPopover("menu");

    fireEvent.click(screen.getByRole("menuitem", { name: "GitHub" }));
    expect(menu.isConnected).toBe(false);
  });

  it("moves through its links by key and closes on Escape back onto the trigger", async () => {
    const trigger = await renderGroup();
    trigger.focus();

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const about = await findInPopover("menuitem", { name: "About" });
    expect(document.activeElement).toBe(about);
    fireEvent.keyDown(about, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toBe("Tags");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement?.textContent).toBe("GitHub");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toBe("About");

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("is current while one of its links is the page, and so is that link", async () => {
    const trigger = await renderGroup("/tags");

    expect(trigger.className).toContain("entry-current");
    expect(trigger.getAttribute("data-current")).toBe("true");
    fireEvent.click(trigger);
    const tags = await findInPopover("menuitem", { name: "Tags" });
    expect(tags.getAttribute("aria-current")).toBe("page");
    // A click opens it on the current link.
    expect(document.activeElement).toBe(tags);
    expect(
      screen
        .getByRole("menuitem", { name: "About" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("is not current on a page none of its links leads to", async () => {
    const trigger = await renderGroup("/posts");
    expect(trigger.className).not.toContain("entry-current");
    expect(trigger.hasAttribute("data-current")).toBe(false);
  });

  it("opens while a mouse rests on it, without taking focus, and closes once it has left", async () => {
    const trigger = await renderGroup();
    vi.useFakeTimers();

    fireEvent.pointerOver(trigger, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(MENU_HOVER_OPEN_DELAY);
    });
    vi.useRealTimers();
    const menu = await findInPopover("menu");
    expect(document.activeElement).not.toBe(menuLinks()[0]);

    // Crossing over to the menu keeps it open.
    vi.useFakeTimers();
    fireEvent.pointerOut(trigger, {
      pointerType: "mouse",
      relatedTarget: menu,
    });
    fireEvent.pointerOver(menu, {
      pointerType: "mouse",
      relatedTarget: trigger,
    });
    act(() => {
      vi.advanceTimersByTime(MENU_HOVER_CLOSE_DELAY * 2);
    });
    expect(menu.isConnected).toBe(true);

    fireEvent.pointerOut(menu, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(MENU_HOVER_CLOSE_DELAY - 1);
    });
    expect(menu.isConnected).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(menu.isConnected).toBe(false);
  });

  it("stays open after a click on the trigger the mouse opened", async () => {
    const trigger = await renderGroup();
    vi.useFakeTimers();
    fireEvent.pointerOver(trigger, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(MENU_HOVER_OPEN_DELAY);
    });
    vi.useRealTimers();
    const menu = await findInPopover("menu");

    fireEvent.click(trigger);
    expect(document.activeElement).toBe(menuLinks()[0]);
    vi.useFakeTimers();
    fireEvent.pointerOut(trigger, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(MENU_HOVER_CLOSE_DELAY * 2);
    });
    expect(menu.isConnected).toBe(true);
  });

  it("does not open for a touch", async () => {
    const trigger = await renderGroup();
    vi.useFakeTimers();
    fireEvent.pointerOver(trigger, { pointerType: "touch" });
    act(() => {
      vi.advanceTimersByTime(MENU_HOVER_OPEN_DELAY * 2);
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
