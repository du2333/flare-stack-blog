// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, createRef, useState, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  AdminChromeProvider,
  useAdminChrome,
  useAdminPrimaryAction,
  type AdminPageAction,
} from "./admin-chrome";

afterEach(cleanup);

/** The header's button, as the frame draws it. */
function Header() {
  const { primaryAction } = useAdminChrome();
  if (!primaryAction) return createElement("output", null, "none");
  return createElement(
    "button",
    {
      type: "button",
      ref: primaryAction.ref,
      onClick: primaryAction.onClick,
      disabled: primaryAction.disabled,
    },
    primaryAction.icon,
    primaryAction.label,
  );
}

function Owner({ action }: { action: AdminPageAction | null }) {
  useAdminPrimaryAction(action);
  return null;
}

function mount(children: ReactNode) {
  return render(
    createElement(AdminChromeProvider, null, createElement(Header), children),
  );
}

const icon = (name: string) => createElement("i", { "data-icon": name });

it("brings the page's own action back when the component that covered it leaves", () => {
  function Page() {
    const [deeper, setDeeper] = useState(false);
    return createElement(
      "div",
      null,
      // The page's props never change below.
      createElement(Owner, { action: { label: "New post", onClick: vi.fn() } }),
      deeper
        ? createElement(Owner, {
            action: { label: "Create key", onClick: vi.fn() },
          })
        : null,
      createElement(
        "button",
        { type: "button", onClick: () => setDeeper((open) => !open) },
        "toggle",
      ),
    );
  }
  mount(createElement(Page));
  expect(screen.getByRole("button", { name: "New post" })).not.toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "toggle" }));
  expect(screen.queryByRole("button", { name: "New post" })).toBeNull();
  expect(screen.getByRole("button", { name: "Create key" })).not.toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "toggle" }));
  expect(screen.queryByRole("button", { name: "Create key" })).toBeNull();
  expect(screen.getByRole("button", { name: "New post" })).not.toBeNull();
});

it("shows the deeper component's action even though a parent's effect runs after the child's", () => {
  function Parent({ children }: { children: ReactNode }) {
    useAdminPrimaryAction({ label: "Page", onClick: vi.fn() });
    return createElement("div", null, children);
  }
  mount(
    createElement(
      Parent,
      null,
      createElement(Owner, { action: { label: "Deeper", onClick: vi.fn() } }),
    ),
  );
  expect(screen.getByRole("button", { name: "Deeper" })).not.toBeNull();
});

it("follows a changed icon, a changed click handler and a changed ref", () => {
  const first = vi.fn();
  const second = vi.fn();
  const firstRef = createRef<HTMLButtonElement>();
  const secondRef = createRef<HTMLButtonElement>();
  const view = (props: AdminPageAction) =>
    createElement(
      AdminChromeProvider,
      null,
      createElement(Header),
      createElement(Owner, { action: props }),
    );
  const { rerender } = render(
    view({ label: "Go", icon: icon("a"), onClick: first, ref: firstRef }),
  );
  expect(document.querySelector("[data-icon]")?.getAttribute("data-icon")).toBe(
    "a",
  );
  expect(firstRef.current).toBe(screen.getByRole("button", { name: "Go" }));

  rerender(
    view({ label: "Go", icon: icon("b"), onClick: second, ref: secondRef }),
  );
  expect(document.querySelector("[data-icon]")?.getAttribute("data-icon")).toBe(
    "b",
  );
  fireEvent.click(screen.getByRole("button", { name: "Go" }));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledOnce();
  expect(firstRef.current).toBeNull();
  expect(secondRef.current).toBe(screen.getByRole("button", { name: "Go" }));
});

it("settles when the caller passes a new icon element and handler on every render", () => {
  let renders = 0;
  function Counted() {
    renders += 1;
    useAdminPrimaryAction({
      label: "Go",
      icon: icon("same"),
      onClick: () => {},
    });
    return null;
  }
  mount(createElement(Counted));
  // Registering must not feed back into the caller's own renders.
  expect(renders).toBeLessThan(5);
  expect(screen.getByRole("button", { name: "Go" })).not.toBeNull();
});
