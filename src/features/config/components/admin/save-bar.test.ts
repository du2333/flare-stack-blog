import { expect, it } from "vitest";
import { isSaveBarVisible } from "./save-bar";

it("hides the save bar while the section is clean", () => {
  expect(isSaveBarVisible({ dirty: false, busy: false, conflict: false })).toBe(
    false,
  );
  expect(isSaveBarVisible({ busy: false })).toBe(false);
});

it("shows the save bar for unsaved changes", () => {
  expect(isSaveBarVisible({ dirty: true, busy: false })).toBe(true);
});

it("keeps the save bar until a running save ends, even if the form is clean", () => {
  expect(isSaveBarVisible({ dirty: false, busy: true })).toBe(true);
});

it("keeps the save bar while a conflict is unresolved", () => {
  expect(isSaveBarVisible({ dirty: false, busy: false, conflict: true })).toBe(
    true,
  );
});
