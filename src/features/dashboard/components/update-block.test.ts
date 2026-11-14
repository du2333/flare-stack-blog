// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { UpdateCheckResult } from "@/features/version/update-check.schema";
import { m } from "@/paraglide/messages";
import { UpdateBlock, type UpdateStatus } from "./update-block";

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
  latestVersion: "v5.0.0",
  hasUpdate: true,
  level: "major",
  entries: [
    {
      version: "4.0.0",
      summary: "Drops the old thing",
      before: [{ id: "a", text: "Re-add the secret as a Secret" }],
    },
    { version: "4.1.0", summary: "Adds a small thing" },
    {
      version: "5.0.0",
      summary: "Removes the old API",
      before: [
        { id: "b", text: "Move integrations to the new API" },
        { id: "c", text: "Rotate the keys" },
      ],
    },
  ],
});

const ready = (
  r: UpdateCheckResult,
  activity: "idle" | "checking" | "failed" = "idle",
): UpdateStatus => ({ kind: "ready", result: r, activity });

function show(status: UpdateStatus) {
  const onRecheck = vi.fn();
  const view = render(createElement(UpdateBlock, { status, onRecheck }));
  const again = (next: UpdateStatus) =>
    view.rerender(createElement(UpdateBlock, { status: next, onRecheck }));
  return { onRecheck, again };
}

const recheckButton = () =>
  screen.getByRole("button", { name: m.admin_overview_update_recheck() });
const releaseLink = () =>
  screen.getByRole("link", { name: m.admin_overview_update_notes_link() });
/** The text of the two live regions: what is being checked, how it failed. */
const regions = () => ({
  status: screen.getByRole("status").textContent,
  alerts: screen
    .getAllByRole("alert")
    .map((node) => node.textContent)
    .filter(Boolean),
});

it("marks a patch with one line: the version and the link", () => {
  show(ready(PATCH));
  expect(
    screen.getByText(m.admin_overview_update_available({ version: "v3.12.2" })),
  ).toBeTruthy();
  expect(releaseLink().getAttribute("href")).toBe(RELEASE_URL);
  expect(document.querySelector(".overview-card")).toBeNull();
  // A patch's summary is not listed.
  expect(screen.queryByText("Fixes a thing")).toBeNull();
});

it("lists each version a minor crosses, oldest first, with the link", () => {
  show(ready(MINOR));
  expect(
    [...document.querySelectorAll(".overview-update-list li")].map(
      (row) => row.textContent,
    ),
  ).toEqual(["v3.13.0Adds the first thing", "v3.14.0Adds the second thing"]);
  expect(document.querySelector(".overview-card")).not.toBeNull();
  expect(releaseLink().getAttribute("href")).toBe(RELEASE_URL);
});

it("lists the things to do of every crossed version that has any, then the summaries", () => {
  show(ready(MAJOR));
  expect(
    screen.getByText(
      m.admin_overview_update_major_title_todo({ version: "v5.0.0" }),
    ),
  ).toBeTruthy();
  const todo = [...document.querySelectorAll(".overview-update-todo")].map(
    (list) => [...list.querySelectorAll("li")].map((li) => li.textContent),
  );
  expect(todo).toEqual([
    ["Re-add the secret as a Secret"],
    ["Move integrations to the new API", "Rotate the keys"],
  ]);
  // A version without things to do has no list of them, but has its summary.
  expect(screen.getByText("Adds a small thing")).toBeTruthy();
  const text = document.body.textContent ?? "";
  expect(text.indexOf("Re-add the secret")).toBeLessThan(
    text.indexOf("Drops the old thing"),
  );
});

it("does not say there is anything to do when no crossed version lists anything", () => {
  show(
    ready({
      ...MAJOR,
      entries: MAJOR.entries.map(({ before: _before, ...entry }) => entry),
    }),
  );
  expect(
    screen.getByText(
      m.admin_overview_update_major_title_nothing({ version: "v5.0.0" }),
    ),
  ).toBeTruthy();
  expect(
    screen.queryByText(
      m.admin_overview_update_major_title_todo({ version: "v5.0.0" }),
    ),
  ).toBeNull();
  expect(screen.queryByText(m.admin_overview_update_before())).toBeNull();
  // The summaries are still there.
  expect(screen.getByText("Removes the old API")).toBeTruthy();
});

it("gives a major no way to dismiss, ignore or fold it away", () => {
  show(ready(MAJOR));
  // The only control is the check; the rest is the link to the release notes.
  expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
    m.admin_overview_update_recheck(),
  ]);
  expect(document.querySelector("[aria-expanded]")).toBeNull();
  expect(document.querySelector("details")).toBeNull();
  expect(document.querySelector("[inert]")).toBeNull();
});

it("keeps the level's form without notes, with one sentence and the link", () => {
  const { again } = show(
    ready({ ...MAJOR, notesAvailable: false, entries: [] }),
  );
  expect(
    screen.getByText(
      m.admin_overview_update_major_title_unknown({ version: "v5.0.0" }),
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(m.admin_overview_update_notes_unavailable()),
  ).toBeTruthy();
  expect(releaseLink().getAttribute("href")).toBe(RELEASE_URL);
  expect(document.querySelector(".overview-update-list")).toBeNull();

  again(ready({ ...MINOR, notesAvailable: false, entries: [] }));
  expect(
    screen.getByText(m.admin_overview_update_notes_unavailable()),
  ).toBeTruthy();
});

it("says the site is up to date, with the running version and the control", () => {
  const { onRecheck } = show(ready(result({ currentVersion: "3.12.1" })));
  expect(
    screen.getByText(m.admin_overview_update_up_to_date({ current: "3.12.1" })),
  ).toBeTruthy();
  fireEvent.click(recheckButton());
  expect(onRecheck).toHaveBeenCalledTimes(1);
});

it("holds the place of the quiet line with a skeleton before the first answer", () => {
  show({ kind: "pending" });
  expect(document.querySelector(".overview-update-skeleton")).not.toBeNull();
  expect(regions().status).toBe(m.admin_overview_update_checking());
  expect((recheckButton() as HTMLButtonElement).disabled).toBe(true);
});

it("says when the check failed, and keeps the last answer on screen", () => {
  const { again } = show(ready(MINOR, "failed"));
  expect(regions().alerts).toContain(m.admin_overview_update_failed_kept());
  expect(screen.getByText("Adds the first thing")).toBeTruthy();

  again({ kind: "failed" });
  expect(regions().alerts).toEqual([m.admin_overview_update_failed()]);
  expect(recheckButton()).toBeTruthy();
});

it("says so while a check runs, and the control waits", () => {
  show(ready(PATCH, "checking"));
  expect(regions()).toEqual({
    status: m.admin_overview_update_checking(),
    alerts: [],
  });
  expect((recheckButton() as HTMLButtonElement).disabled).toBe(true);
});

it("keeps the control and the live regions in place while the state changes", () => {
  const { again } = show(ready(PATCH));
  const button = recheckButton();
  const status = screen.getByRole("status");
  button.focus();
  expect(document.activeElement).toBe(button);

  again(ready(PATCH, "checking"));
  expect(recheckButton()).toBe(button);
  again(ready(MINOR));
  expect(recheckButton()).toBe(button);
  again(ready(MAJOR, "failed"));
  expect(recheckButton()).toBe(button);
  again(ready(result({})));
  expect(recheckButton()).toBe(button);
  expect(screen.getByRole("status")).toBe(status);
  expect(document.activeElement).toBe(button);
});

it("announces a major once: the alert is its title, and a re-render keeps it", () => {
  const { again } = show(ready(MAJOR));
  const alerts = () =>
    screen.getAllByRole("alert").filter((node) => node.textContent);
  expect(alerts()).toHaveLength(1);
  const title = alerts()[0]!;
  expect(title.textContent).toBe(
    m.admin_overview_update_major_title_todo({ version: "v5.0.0" }),
  );
  // The callout around it and the sections inside it are not alerts.
  expect(title.closest(".overview-update")?.getAttribute("role")).toBeNull();

  // The same answer again, and a check running over it: the same node, so
  // nothing is announced a second time.
  again(ready({ ...MAJOR }));
  again(ready({ ...MAJOR }, "checking"));
  expect(alerts()).toEqual([title]);
});

it("puts the warning's sections under the overview's h2, never below h1 directly", () => {
  show(ready(MAJOR));
  const levels = [...document.querySelectorAll("h1,h2,h3,h4")].map(
    (heading) => heading.tagName,
  );
  expect(levels).toEqual(["H2", "H2"]);
});

it("gives a long version number room in its own column", () => {
  show(
    ready(
      result({
        latestVersion: "v10.12.3",
        hasUpdate: true,
        level: "minor",
        entries: [
          { version: "10.12.3", summary: "A summary beside a long version" },
        ],
      }),
    ),
  );
  expect(document.querySelector(".overview-update-list b")?.textContent).toBe(
    "v10.12.3",
  );
});

it("shows text from the notes as text, never as markup or a link", () => {
  show(
    ready(
      result({
        ...MAJOR,
        entries: [
          {
            version: "4.0.0",
            summary:
              "<img src=x onerror=alert(1)> **bold** https://example.com",
            before: [
              { id: "a", text: "<b>run</b> [this](https://example.com)" },
            ],
          },
        ],
      }),
    ),
  );
  expect(document.querySelector("img")).toBeNull();
  // The only <b> is the version label of the one entry.
  expect(document.querySelectorAll("b")).toHaveLength(1);
  expect(document.querySelectorAll("a")).toHaveLength(1);
  expect(
    screen.getByText("<b>run</b> [this](https://example.com)"),
  ).toBeTruthy();
});
