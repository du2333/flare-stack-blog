// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ConfirmationModal from "./confirmation-modal";

vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const props = () => ({
  isOpen: true,
  title: "Delete image",
  message: "Delete selected image?",
  onClose: vi.fn(),
  onConfirm: vi.fn(),
});

it("keeps the previous content and modal open until exit finishes, then restores focus", () => {
  const input = document.createElement("input");
  document.body.appendChild(input);
  input.focus();
  const initial = props();
  const { rerender } = render(createElement(ConfirmationModal, initial));
  const dialog = screen.getByRole("dialog") as HTMLDialogElement;
  rerender(
    createElement(ConfirmationModal, {
      ...initial,
      isOpen: false,
      title: "",
      message: "",
    }),
  );
  expect(dialog.open).toBe(true);
  expect(dialog.textContent).toContain("Delete selected image?");
  expect(dialog.dataset.state).toBe("closing");
  expect(
    dialog.querySelector(".fuwari-modal-content")?.hasAttribute("inert"),
  ).toBe(true);
  act(() => vi.advanceTimersByTime(199));
  expect(dialog.open).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(input);
  input.remove();
});

it("cancels pending exit when reopened and blocks Escape while submitting", () => {
  const initial = props();
  const { rerender } = render(createElement(ConfirmationModal, initial));
  const dialog = screen.getByRole("dialog") as HTMLDialogElement;
  rerender(createElement(ConfirmationModal, { ...initial, isOpen: false }));
  act(() => vi.advanceTimersByTime(100));
  rerender(createElement(ConfirmationModal, { ...initial, isLoading: true }));
  act(() => vi.advanceTimersByTime(300));
  expect(dialog.open).toBe(true);
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(initial.onClose).not.toHaveBeenCalled();
  rerender(createElement(ConfirmationModal, initial));
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(initial.onClose).toHaveBeenCalledOnce();
});

it("uses unique labels and skips the exit delay for reduced motion", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const initial = props();
  const { rerender } = render(
    createElement(
      "div",
      null,
      createElement(ConfirmationModal, initial),
      createElement(ConfirmationModal, {
        ...initial,
        title: "Another confirmation",
      }),
    ),
  );
  const dialogs = screen.getAllByRole("dialog");
  expect(dialogs[0].getAttribute("aria-labelledby")).not.toBe(
    dialogs[1].getAttribute("aria-labelledby"),
  );
  rerender(
    createElement(
      "div",
      null,
      createElement(ConfirmationModal, { ...initial, isOpen: false }),
      createElement(ConfirmationModal, {
        ...initial,
        title: "Another confirmation",
      }),
    ),
  );
  act(() => vi.advanceTimersByTime(0));
  expect((dialogs[0] as HTMLDialogElement).open).toBe(false);
});
