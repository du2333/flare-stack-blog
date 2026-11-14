// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { UpdateCheckResult } from "@/features/version/update-check.schema";
import { m } from "@/paraglide/messages";
import { UpdateBlock, type UpdateBlockProps } from "./update-block";

afterEach(cleanup);

const RELEASE_URL = "https://example.com/releases/latest";

function result(change: Partial<UpdateCheckResult>): UpdateCheckResult {
  return {
    latestVersion: "v3.12.1",
    currentVersion: "3.12.1",
    hasUpdate: false,
    releaseUrl: RELEASE_URL,
    level: null,
    entries: [],
    notesAvailable: true,
    ...change,
  };
}

const PATCH = result({
  latestVersion: "v3.12.2",
  hasUpdate: true,
  level: "patch",
  entries: [{ version: "3.12.2", summary: "Fixes a thing" }],
});
const MINOR = result({
  latestVersion: "v3.14.0",
  hasUpdate: true,
  level: "minor",
  entries: [
    { version: "3.13.0", summary: "Adds the first thing" },
    { version: "3.14.0", summary: "Adds the second thing" },
  ],
});
const MAJOR = result({
  latestVersion: "v4.1.0",
  hasUpdate: true,
  level: "major",
  entries: [
    {
      version: "4.0.0",
      summary: "Drops the old thing",
      before: [{ id: "a", text: "Re-add the secret as a Secret" }],
    },
    { version: "4.1.0", summary: "Adds a small thing" },
  ],
});

function show(
  props: Partial<UpdateBlockProps> & { result: UpdateBlockProps["result"] },
) {
  const onRecheck = vi.fn();
  render(
    createElement(UpdateBlock, {
      checking: false,
      failed: false,
      onRecheck,
      ...props,
    }),
  );
  return onRecheck;
}

const recheckButton = () =>
  screen.getByRole("button", { name: m.admin_overview_update_recheck() });
const releaseLink = () =>
  screen.getByRole("link", { name: m.admin_overview_update_notes_link() });

it("marks a patch with one line: the version and the link", () => {
  show({ result: PATCH });
  expect(
    screen.getByText(m.admin_overview_update_available({ version: "v3.12.2" })),
  ).toBeTruthy();
  expect(releaseLink().getAttribute("href")).toBe(RELEASE_URL);
  expect(document.querySelector(".overview-card")).toBeNull();
  // A patch's summary is not listed.
  expect(screen.queryByText("Fixes a thing")).toBeNull();
});

it("lists each version a minor crosses, oldest first, with the link", () => {
  show({ result: MINOR });
  expect(
    [...document.querySelectorAll(".overview-update-list li")].map(
      (row) => row.textContent,
    ),
  ).toEqual(["v3.13.0Adds the first thing", "v3.14.0Adds the second thing"]);
  expect(document.querySelector(".overview-card")).not.toBeNull();
  expect(releaseLink().getAttribute("href")).toBe(RELEASE_URL);
});

it("warns on a major with what to do before syncing, then the summaries", () => {
  show({ result: MAJOR });
  expect(
    screen.getByText(
      m.admin_overview_update_major_title({ version: "v4.1.0" }),
    ),
  ).toBeTruthy();
  expect(screen.getByText("Re-add the secret as a Secret")).toBeTruthy();
  expect(screen.getByText("Drops the old thing")).toBeTruthy();
  expect(screen.getByText("Adds a small thing")).toBeTruthy();
  const text = document.body.textContent ?? "";
  expect(text.indexOf("Re-add the secret")).toBeLessThan(
    text.indexOf("Drops the old thing"),
  );
});

it("gives a major no way to dismiss, ignore or fold it away", () => {
  show({ result: MAJOR });
  // The only control is the check; the rest is the link to the notes.
  expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
    m.admin_overview_update_recheck(),
  ]);
  expect(document.querySelector("[aria-expanded]")).toBeNull();
  expect(document.querySelector("details")).toBeNull();
  expect(document.querySelector("[inert]")).toBeNull();
});

it("keeps the level's form without notes, with one sentence and the link", () => {
  show({ result: { ...MAJOR, notesAvailable: false, entries: [] } });
  expect(
    screen.getByText(
      m.admin_overview_update_major_title({ version: "v4.1.0" }),
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(m.admin_overview_update_notes_unavailable()),
  ).toBeTruthy();
  expect(releaseLink().getAttribute("href")).toBe(RELEASE_URL);
  expect(document.querySelector(".overview-update-list")).toBeNull();

  cleanup();
  show({ result: { ...MINOR, notesAvailable: false, entries: [] } });
  expect(
    screen.getByText(m.admin_overview_update_notes_unavailable()),
  ).toBeTruthy();
});

it("says the site is up to date, with the running version and the control", () => {
  const onRecheck = show({ result: result({ currentVersion: "3.12.1" }) });
  expect(
    screen.getByText(m.admin_overview_update_up_to_date({ current: "3.12.1" })),
  ).toBeTruthy();
  fireEvent.click(recheckButton());
  expect(onRecheck).toHaveBeenCalledTimes(1);
});

it("says when the check failed, and keeps the last answer on screen", () => {
  show({ result: MINOR, failed: true });
  expect(screen.getByRole("alert").textContent).toBe(
    m.admin_overview_update_failed_kept(),
  );
  expect(screen.getByText("Adds the first thing")).toBeTruthy();

  cleanup();
  show({ result: null, failed: true });
  expect(screen.getByRole("alert").textContent).toBe(
    m.admin_overview_update_failed(),
  );
  expect(recheckButton()).toBeTruthy();
});

it("says so while a check runs, and the control waits", () => {
  show({ result: PATCH, checking: true, failed: true });
  expect(screen.getByRole("status").textContent).toBe(
    m.admin_overview_update_checking(),
  );
  expect(screen.queryByRole("alert")).toBeNull();
  expect((recheckButton() as HTMLButtonElement).disabled).toBe(true);
});

it("shows text from the notes as text, never as markup or a link", () => {
  show({
    result: result({
      ...MAJOR,
      entries: [
        {
          version: "4.0.0",
          summary: "<img src=x onerror=alert(1)> **bold** https://example.com",
          before: [{ id: "a", text: "<b>run</b> [this](https://example.com)" }],
        },
      ],
    }),
  });
  expect(document.querySelector("img")).toBeNull();
  // The only <b> is the version label of the one entry.
  expect(document.querySelectorAll("b")).toHaveLength(1);
  expect(document.querySelectorAll("a")).toHaveLength(1);
  expect(
    screen.getByText("<b>run</b> [this](https://example.com)"),
  ).toBeTruthy();
});
