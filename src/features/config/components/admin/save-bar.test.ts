import { expect, it } from "vitest";
import { countChangedSettings, isSaveBarVisible } from "./save-bar";

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

it("counts a field as one change and a whole list as one", () => {
  expect(countChangedSettings({})).toBe(0);
  expect(countChangedSettings(undefined)).toBe(0);
  expect(countChangedSettings({ title: true, author: true })).toBe(2);
  expect(
    countChangedSettings({
      title: true,
      navLinks: [{ label: true }, { href: true }],
      social: [undefined, { url: true }],
    }),
  ).toBe(3);
  expect(countChangedSettings({ navLinks: [{ label: false }] })).toBe(0);
  expect(
    countChangedSettings({ icons: { faviconSvg: true, favicon96: true } }),
  ).toBe(2);
});
