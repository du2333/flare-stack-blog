// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";

// Only the button's class names matter to the Toaster; the button itself is
// slow to transform.
vi.mock("@/components/ui/button", () => ({ buttonClass: () => "" }));

// The facade keeps its state in the module, as it does in the browser, so
// each test starts from a fresh one.
async function load() {
  vi.resetModules();
  const { toast } = await import("./toast");
  const { LazyToaster } = await import("@/components/layout/lazy-toaster");
  return { toast, LazyToaster };
}

afterEach(() => {
  cleanup();
  vi.resetModules();
});

it("mounts nothing, and so loads no sonner, until a toast is requested", async () => {
  const { LazyToaster } = await load();

  const { container } = render(createElement(LazyToaster));

  expect(container.innerHTML).toBe("");
  expect(document.querySelector("[data-sonner-toaster]")).toBeNull();
});

it("shows a toast requested before sonner has loaded, once, when it has", async () => {
  const { toast, LazyToaster } = await load();
  render(createElement(LazyToaster));

  act(() => {
    toast.error("Link not copied", { description: "Try again" });
  });

  expect(await screen.findByText("Link not copied")).toBeTruthy();
  expect(screen.getByText("Try again")).toBeTruthy();
  expect(screen.getAllByText("Link not copied")).toHaveLength(1);
});

it("keeps every toast asked for while sonner loads", async () => {
  const { toast, LazyToaster } = await load();
  render(createElement(LazyToaster));

  act(() => {
    toast.success("kept first");
    toast.warning("kept second");
  });

  expect(await screen.findByText("kept first")).toBeTruthy();
  expect(await screen.findByText("kept second")).toBeTruthy();
});

it("shows a toast asked for after sonner has loaded straight away", async () => {
  const { toast, LazyToaster } = await load();
  render(createElement(LazyToaster));
  act(() => {
    toast.success("loaded");
  });
  await screen.findByText("loaded");

  act(() => {
    toast.success("later");
  });

  expect(await screen.findByText("later")).toBeTruthy();
});
