import { expect, it } from "vitest";
import {
  countChangedNotificationSettings,
  countChangedSettings,
  isSaveBarVisible,
} from "./save-bar";

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

it("counts the notification rows as the page shows them", () => {
  expect(countChangedNotificationSettings({})).toBe(0);
  // The email account is one row, however many of its fields changed.
  expect(
    countChangedNotificationSettings({
      email: { host: true, port: true, password: true },
      clearEmailPassword: true,
    }),
  ).toBe(1);
  expect(
    countChangedNotificationSettings({
      notification: {
        admin: { channels: { email: true } },
        user: { emailEnabled: true },
      },
    }),
  ).toBe(2);
  // The endpoint's address, token and template are rows of their own.
  expect(
    countChangedNotificationSettings({
      notification: { webhook: { url: true, secret: true } },
      clearWebhookSecret: true,
    }),
  ).toBe(2);
});

it("counts switching the Webhook provider as one change", () => {
  expect(
    countChangedNotificationSettings({
      notification: {
        webhook: { provider: true, secret: true, url: true, template: true },
      },
      clearWebhookSecret: true,
    }),
  ).toBe(1);
});
