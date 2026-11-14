// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { UpdateCheckResult } from "@/features/version/update-check.schema";
import { m } from "@/paraglide/messages";
import {
  type DismissalChange,
  UpdateBlock,
  type UpdateStatus,
} from "./update-block";

// Unmount the sheet as soon as it closes, and render it as on a wide screen;
// exit motion and the phone form are not under test.
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
  useMediaQuery: () => false,
}));

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
    dismissed: false,
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
    { version: "3.13.1", summary: "Fixes the first thing" },
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
const unavailable = (r: UpdateCheckResult) => ({
  ...r,
  notesAvailable: false,
  entries: [],
});
const dismissedOf = (r: UpdateCheckResult) => ({ ...r, dismissed: true });

const ready = (
  r: UpdateCheckResult,
  activity: "idle" | "checking" | "failed" = "idle",
): UpdateStatus => ({ kind: "ready", result: r, activity });

const IDLE: DismissalChange = { kind: "idle" };

function show(status: UpdateStatus, change: DismissalChange = IDLE) {
  const onRecheck = vi.fn();
  const onDismiss = vi.fn();
  const onRestore = vi.fn();
  const onOpenDetails = vi.fn();
  const props = { onRecheck, onDismiss, onRestore, onOpenDetails };
  const view = render(createElement(UpdateBlock, { status, change, ...props }));
  const again = (next: UpdateStatus, nextChange: DismissalChange = IDLE) =>
    view.rerender(
      createElement(UpdateBlock, {
        status: next,
        change: nextChange,
        ...props,
      }),
    );
  return { onRecheck, onDismiss, onRestore, onOpenDetails, again };
}

const line = () => document.querySelector<HTMLElement>(".overview-update")!;
/** What the line says: its words, whatever its failure region holds. */
const words = () =>
  line().querySelector(".overview-line-words > span:first-child")?.textContent;
const viewButton = () =>
  screen.getByRole("button", { name: m.admin_overview_update_view() });
const restoreButton = () =>
  screen.getByRole("button", { name: m.admin_overview_update_restore() });
const recheckButton = () =>
  within(line()).getByRole("button", {
    name: m.admin_overview_update_recheck(),
  });
const sheet = () => screen.queryByRole("dialog");
const inSheet = () => within(screen.getByRole("dialog"));
const lineFailure = () =>
  line().querySelector(".overview-line-failure")?.textContent;
const sheetFailure = () =>
  document.querySelector(".overview-sheet-failure")?.textContent;
const open = () => fireEvent.click(viewButton());

it("says an update of one version in one line with 「查看」 and the check", () => {
  show(ready(PATCH));
  expect(words()).toBe(
    m.admin_overview_update_available({ version: "v3.12.2" }),
  );
  // Only the controls of the line: the details are not on the page.
  expect(
    within(line())
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent),
  ).toEqual([
    m.admin_overview_update_view(),
    m.admin_overview_update_recheck(),
  ]);
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.queryByText("Fixes a thing")).toBeNull();
  expect(document.querySelector(".fuwari-callout")).toBeNull();
  expect(sheet()).toBeNull();
});

it("counts the versions a minor crosses, and lists none of them", () => {
  show(ready(MINOR));
  expect(words()).toBe(
    m.admin_overview_update_available_many({ version: "v3.14.0", count: 3 }),
  );
  expect(screen.queryByText("Adds the first thing")).toBeNull();
  expect(document.querySelector("ol, ul")).toBeNull();
  expect(document.querySelector(".fuwari-callout")).toBeNull();
});

it("counts a minor of one version as a plain update", () => {
  show(ready({ ...MINOR, entries: MINOR.entries.slice(0, 1) }));
  expect(words()).toBe(
    m.admin_overview_update_available({ version: "v3.14.0" }),
  );
});

it("makes a major one warning row that counts the things to do of every crossed version", () => {
  show(ready(MAJOR));
  expect(words()).toBe(
    m.admin_overview_update_major_todo({ version: "v5.0.0", count: 3 }),
  );
  // The surface is the warning's; the row has the same controls as a line.
  expect(line().classList.contains("fuwari-callout")).toBe(true);
  expect(line().getAttribute("data-tone")).toBe("warning");
  expect(
    within(line())
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent),
  ).toEqual([
    m.admin_overview_update_view(),
    m.admin_overview_update_recheck(),
  ]);
  expect(screen.queryByText("Re-add the secret as a Secret")).toBeNull();
});

it("tells a major with nothing to do before syncing to read the upgrade notes", () => {
  show(
    ready({
      ...MAJOR,
      entries: MAJOR.entries.map(({ before: _before, ...entry }) => entry),
    }),
  );
  expect(words()).toBe(
    m.admin_overview_update_major_nothing({ version: "v5.0.0" }),
  );
});

it("says the notes are unavailable in place of the count, at each level", () => {
  const { again } = show(ready(unavailable(MAJOR)));
  expect(words()).toBe(
    m.admin_overview_update_major_unavailable({ version: "v5.0.0" }),
  );
  again(ready(unavailable(MINOR)));
  expect(words()).toBe(
    m.admin_overview_update_available_unavailable({ version: "v3.14.0" }),
  );
  again(ready(unavailable(PATCH)));
  expect(words()).toBe(
    m.admin_overview_update_available_unavailable({ version: "v3.12.2" }),
  );
});

it("says the site is up to date with the running version and the check", () => {
  const { onRecheck } = show(ready(result({ currentVersion: "3.12.1" })));
  expect(words()).toBe(
    m.admin_overview_update_up_to_date({ current: "3.12.1" }),
  );
  expect(
    screen.queryByRole("button", { name: m.admin_overview_update_view() }),
  ).toBeNull();
  fireEvent.click(recheckButton());
  expect(onRecheck).toHaveBeenCalledTimes(1);
});

it("holds the place of the line with a skeleton and no control before the first answer", () => {
  show({ kind: "pending" });
  expect(document.querySelector(".overview-update-skeleton")).not.toBeNull();
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(screen.getByRole("status").textContent).toBe(
    m.admin_overview_update_checking(),
  );
});

it("turns a dismissed update into one quiet line with 「恢复提醒」, a major still named", () => {
  const { onRestore, again } = show(ready(dismissedOf(MINOR)));
  expect(words()).toBe(
    m.admin_overview_update_dismissed({ version: "v3.14.0" }),
  );
  expect(screen.queryByRole("link")).toBeNull();
  expect(
    screen.queryByRole("button", { name: m.admin_overview_update_view() }),
  ).toBeNull();
  expect(recheckButton()).toBeTruthy();
  fireEvent.click(restoreButton());
  expect(onRestore).toHaveBeenCalledTimes(1);

  again(ready(dismissedOf(MAJOR)));
  expect(words()).toBe(
    m.admin_overview_update_dismissed_major({ version: "v5.0.0" }),
  );
  expect(document.querySelector(".fuwari-callout")).toBeNull();
  expect(document.querySelector("[role=alert]:not(:empty)")).toBeNull();
});

it("says a first check failed, and keeps an earlier answer's line with the failure beside it", () => {
  const { again, onRecheck } = show({ kind: "failed" });
  expect(lineFailure()).toBe(m.admin_overview_update_failed());
  expect(words()).toBe("");
  fireEvent.click(recheckButton());
  expect(onRecheck).toHaveBeenCalledTimes(1);

  again(ready(MINOR, "failed"));
  expect(words()).toBe(
    m.admin_overview_update_available_many({ version: "v3.14.0", count: 3 }),
  );
  expect(lineFailure()).toBe(m.admin_overview_update_failed());
  expect(viewButton()).toBeTruthy();
});

it("shows a running check as a spinner and a status, and ignores a second press", () => {
  const { onRecheck } = show(ready(PATCH, "checking"));
  expect(screen.getByRole("status").textContent).toBe(
    m.admin_overview_update_checking(),
  );
  expect(recheckButton().getAttribute("aria-busy")).toBe("true");
  expect(recheckButton().querySelector(".animate-spin")).not.toBeNull();
  fireEvent.click(recheckButton());
  expect(onRecheck).not.toHaveBeenCalled();
  expect(lineFailure()).toBe("");
});

it("opens the details from 「查看」 and closes them with Escape, focus going back", () => {
  const { onOpenDetails } = show(ready(PATCH));
  const control = viewButton();
  expect(control.getAttribute("aria-haspopup")).toBe("dialog");
  expect(control.getAttribute("aria-expanded")).toBe("false");

  control.focus();
  open();
  expect(onOpenDetails).toHaveBeenCalledTimes(1);
  expect(sheet()).not.toBeNull();
  expect(control.getAttribute("aria-expanded")).toBe("true");

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(sheet()).toBeNull();
  expect(control.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(control);
});

it("titles the sheet with the step and the level, and lists the summary of a patch", () => {
  show(ready(PATCH));
  open();
  const dialog = screen.getByRole("dialog");
  const title = within(dialog).getByRole("heading", { level: 2 });
  expect(title.textContent).toBe("v3.12.1 → v3.12.2");
  expect(dialog.getAttribute("aria-labelledby")).toBe(title.id);
  expect(
    within(dialog).getByText(m.admin_overview_update_level_patch()),
  ).toBeTruthy();
  expect(within(dialog).getByText("Fixes a thing")).toBeTruthy();
  // A patch has nothing to do first.
  expect(
    within(dialog).queryByText(m.admin_overview_update_before()),
  ).toBeNull();
});

it("lists each version a minor crosses, oldest first", () => {
  show(ready(MINOR));
  open();
  expect(
    [...document.querySelectorAll(".overview-sheet-list li")].map(
      (row) => row.textContent,
    ),
  ).toEqual([
    "v3.13.0Adds the first thing",
    "v3.13.1Fixes the first thing",
    "v3.14.0Adds the second thing",
  ]);
  expect(
    inSheet().getByText(m.admin_overview_update_level_minor()),
  ).toBeTruthy();
  expect(inSheet().getByText(m.admin_overview_update_summaries())).toBeTruthy();
  expect(inSheet().queryByText(m.admin_overview_update_before())).toBeNull();
});

it("lists a major's things to do by version first, then the summaries, under ordered headings", () => {
  show(ready(MAJOR));
  open();
  expect(
    inSheet().getByText(m.admin_overview_update_level_major()),
  ).toBeTruthy();
  const todo = [...document.querySelectorAll(".overview-sheet-todo")].map(
    (list) => [...list.querySelectorAll("li")].map((li) => li.textContent),
  );
  expect(todo).toEqual([
    ["Re-add the secret as a Secret"],
    ["Move integrations to the new API", "Rotate the keys"],
  ]);
  expect(
    [...document.querySelectorAll(".overview-sheet-version")].map(
      (node) => node.textContent,
    ),
  ).toEqual(["v4.0.0", "v5.0.0"]);
  // A version with nothing to do has its summary, not a list.
  expect(inSheet().getByText("Adds a small thing")).toBeTruthy();
  const text = screen.getByRole("dialog").textContent ?? "";
  expect(text.indexOf("Re-add the secret")).toBeLessThan(
    text.indexOf("Drops the old thing"),
  );
  expect(
    [...screen.getByRole("dialog").querySelectorAll("h1,h2,h3,h4")].map(
      (heading) => heading.tagName,
    ),
  ).toEqual(["H2", "H3", "H3"]);
});

it("puts the one sentence in the sheet in place of both lists when the notes are unavailable", () => {
  show(ready(unavailable(MAJOR)));
  open();
  expect(
    inSheet().getByText(m.admin_overview_update_notes_unavailable()),
  ).toBeTruthy();
  expect(document.querySelector(".overview-sheet-list")).toBeNull();
  expect(inSheet().queryByText(m.admin_overview_update_before())).toBeNull();
  expect(inSheet().queryByText(m.admin_overview_update_summaries())).toBeNull();
  // The footer is still there.
  expect(inSheet().getByRole("link")).toBeTruthy();
});

it("gives the sheet a footer with the release notes, the dismissal and the check", () => {
  const { onDismiss, onRecheck } = show(ready(MAJOR));
  open();
  const link = inSheet().getByRole("link", {
    name: m.admin_overview_update_notes_link(),
  });
  expect(link.getAttribute("href")).toBe(RELEASE_URL);
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");

  fireEvent.click(
    inSheet().getByRole("button", { name: m.admin_overview_update_dismiss() }),
  );
  expect(onDismiss).toHaveBeenCalledTimes(1);
  fireEvent.click(
    inSheet().getByRole("button", { name: m.admin_overview_update_recheck() }),
  );
  expect(onRecheck).toHaveBeenCalledTimes(1);
});

it("closes the sheet and focuses 「恢复提醒」 once the dismissal is done", () => {
  const { again } = show(ready(MAJOR));
  viewButton().focus();
  open();
  again(ready(dismissedOf(MAJOR)), { kind: "done", of: "dismiss" });
  expect(sheet()).toBeNull();
  expect(document.activeElement).toBe(restoreButton());
  expect(screen.getByRole("status").textContent).toBe(
    m.admin_overview_update_dismiss_done({ version: "v5.0.0" }),
  );
});

it("keeps the sheet open and says inside it that a dismissal failed", () => {
  const { again } = show(ready(MINOR));
  open();
  again(ready(MINOR), { kind: "failed", of: "dismiss" });
  expect(sheet()).not.toBeNull();
  expect(sheetFailure()).toBe(m.admin_overview_update_dismiss_failed());
  // The line says nothing of it: the sheet is where it was pressed.
  expect(lineFailure()).toBe("");
  expect(
    inSheet().getByRole("button", { name: m.admin_overview_update_dismiss() }),
  ).toBeTruthy();
});

it("shows a dismissal in progress on its button, which ignores a second press", () => {
  const { onDismiss, again } = show(ready(MINOR));
  open();
  again(ready(MINOR), { kind: "pending", of: "dismiss" });
  const button = inSheet().getByRole("button", {
    name: m.admin_overview_update_dismiss(),
  });
  expect(button.getAttribute("aria-disabled")).toBe("true");
  expect(button.querySelector(".animate-spin")).not.toBeNull();
  fireEvent.click(button);
  expect(onDismiss).not.toHaveBeenCalled();
});

it("restores from the line, focus staying on the control that is now 「查看」", () => {
  const { again, onRestore } = show(ready(dismissedOf(MINOR)));
  const control = restoreButton();
  control.focus();
  fireEvent.click(control);
  expect(onRestore).toHaveBeenCalledTimes(1);

  again(ready(MINOR), { kind: "done", of: "restore" });
  expect(viewButton()).toBe(control);
  expect(document.activeElement).toBe(control);
  expect(screen.getByRole("status").textContent).toBe(
    m.admin_overview_update_restore_done(),
  );
  expect(sheet()).toBeNull();
});

it("says a failed restore on the line", () => {
  show(ready(dismissedOf(MINOR)), { kind: "failed", of: "restore" });
  expect(lineFailure()).toBe(m.admin_overview_update_restore_failed());
});

it("closes the sheet when a check finds nothing left to show", () => {
  const { again } = show(ready(PATCH));
  open();
  again(ready(result({})));
  expect(sheet()).toBeNull();
  expect(words()).toBe(
    m.admin_overview_update_up_to_date({ current: "3.12.1" }),
  );
});

it("does not announce an old outcome once a later answer has moved the line on", () => {
  const { again } = show(ready(MINOR));
  again(ready(dismissedOf(MINOR)), { kind: "done", of: "dismiss" });
  expect(screen.getByRole("status").textContent).toBe(
    m.admin_overview_update_dismiss_done({ version: "v3.14.0" }),
  );
  again(ready(result({})), { kind: "done", of: "dismiss" });
  expect(screen.getByRole("status").textContent).toBe("");
});

it("keeps the recheck control and the status region in place while the state changes", () => {
  const { again } = show(ready(PATCH));
  const button = recheckButton();
  const status = screen.getByRole("status");
  button.focus();

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

it("announces a major once, from the row's text, and a re-render keeps it", () => {
  const { again } = show(ready(MAJOR));
  const alerts = () =>
    screen.getAllByRole("alert").filter((node) => node.textContent);
  expect(alerts()).toHaveLength(1);
  const text = alerts()[0]!;
  expect(text.textContent).toBe(
    m.admin_overview_update_major_todo({ version: "v5.0.0", count: 3 }),
  );
  // The same answer again, and a check running over it: the same node, so
  // nothing is announced a second time.
  again(ready({ ...MAJOR }));
  again(ready({ ...MAJOR }, "checking"));
  expect(alerts()).toEqual([text]);
  // Neither the patch nor the minor line is an alert.
  again(ready(MINOR));
  expect(alerts()).toEqual([]);
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
  open();
  expect(document.querySelector("img")).toBeNull();
  // The only <b> is the version label of the one entry.
  expect(document.querySelectorAll("b")).toHaveLength(1);
  // The only link is the release notes'.
  expect(document.querySelectorAll("a")).toHaveLength(1);
  expect(
    screen.getByText("<b>run</b> [this](https://example.com)"),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "<img src=x onerror=alert(1)> **bold** https://example.com",
    ),
  ).toBeTruthy();
});
