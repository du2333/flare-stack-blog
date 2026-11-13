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
import { createElement, useState } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NavGroupOption,
  NavOption,
} from "@/components/layout/layout-props";
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

async function renderGroup(
  path = "/",
  group: NavGroupOption = GROUP,
  navOptions: Array<NavOption> = [group],
) {
  const root = createRootRoute({
    component: () =>
      createElement(
        "nav",
        null,
        createElement(NavGroupMenu, {
          group,
          navOptions,
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

/** The group in a bar whose "Move" button changes its `dismissOn`. */
async function renderMovingGroup() {
  function Bar() {
    const [moves, setMoves] = useState(0);
    return createElement(
      "nav",
      null,
      createElement(NavGroupMenu, {
        group: GROUP,
        navOptions: [GROUP],
        dismissOn: moves,
      }),
      createElement("a", { href: "/after" }, "After"),
      // Not a control of the page: it stands for whatever moves the bar.
      createElement("span", { onClick: () => setMoves((n) => n + 1) }, "Move"),
    );
  }
  const root = createRootRoute({
    component: Bar,
    notFoundComponent: () => null,
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });
  return screen.findByRole("button", { name: "Elsewhere" });
}

function move() {
  fireEvent.click(screen.getByText("Move"));
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
    expect(trigger.getAttribute("aria-current")).toBe("true");
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
    expect(trigger.hasAttribute("aria-current")).toBe(false);
  });

  it("is current by the one rule of the whole navigation", async () => {
    const group: NavGroupOption = {
      id: "custom-0",
      label: "Elsewhere",
      children: [
        { id: "custom-0-0", label: "Deep", href: "/posts/x", external: false },
      ],
    };
    const posts = {
      id: "posts",
      label: "Posts",
      href: "/posts",
      external: false,
    };
    // Under /posts/x the group's longer address wins over the Post list.
    let trigger = await renderGroup("/posts/x", group, [posts, group]);
    expect(trigger.getAttribute("aria-current")).toBe("true");
    cleanup();
    // Under /posts/y the Post list wins, and the group is not current.
    trigger = await renderGroup("/posts/y", group, [posts, group]);
    expect(trigger.hasAttribute("aria-current")).toBe(false);
  });

  it("closes a menu the mouse opened once Tab moves focus on from the trigger", async () => {
    const trigger = await renderGroup();
    trigger.focus();
    vi.useFakeTimers();
    fireEvent.pointerOver(trigger, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(MENU_HOVER_OPEN_DELAY);
    });
    vi.useRealTimers();
    const menu = await findInPopover("menu");
    expect(document.activeElement).toBe(trigger);

    const after = screen.getByRole("link", { name: "After" });
    fireEvent.blur(trigger, { relatedTarget: after });
    expect(menu.isConnected).toBe(false);
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

  describe("with dismissOn", () => {
    it("closes once it changes, and gives the focus that was in the menu to the trigger", async () => {
      const trigger = await renderMovingGroup();
      fireEvent.click(trigger);
      const menu = await findInPopover("menu");
      expect(menu.contains(document.activeElement)).toBe(true);

      move();

      expect(menu.isConnected).toBe(false);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(trigger);
    });

    it("leaves focus that was elsewhere where it is", async () => {
      const trigger = await renderMovingGroup();
      vi.useFakeTimers();
      fireEvent.pointerOver(trigger, { pointerType: "mouse" });
      act(() => {
        vi.advanceTimersByTime(MENU_HOVER_OPEN_DELAY);
      });
      vi.useRealTimers();
      const menu = await findInPopover("menu");
      const after = screen.getByRole("link", { name: "After" });
      after.focus();

      move();

      expect(menu.isConnected).toBe(false);
      expect(document.activeElement).toBe(after);
    });

    it("leaves a closed menu closed, and one opened after the change open", async () => {
      const trigger = await renderMovingGroup();
      move();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(trigger);
      const menu = await findInPopover("menu");
      expect(menu.isConnected).toBe(true);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");

      move();
      expect(menu.isConnected).toBe(false);
    });
  });
});
