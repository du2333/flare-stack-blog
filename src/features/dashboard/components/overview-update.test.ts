// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useVersionCheck } from "@/features/version/hooks/use-version-check";
import type { UpdateCheckResult } from "@/features/version/update-check.schema";
import { m } from "@/paraglide/messages";
import { OverviewUpdate } from "./overview-update";

const calls = vi.hoisted(() => ({
  check: vi.fn(),
  force: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("@/features/version/queries", () => ({
  updateCheckQuery: {
    queryKey: ["version", "check"],
    queryFn: () => calls.check(),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  },
}));
vi.mock("@/lib/orpc", () => ({
  orpcClient: {
    version: {
      forceCheck: () => calls.force(),
      dismissUpdate: (input: { version: string | null }) =>
        calls.dismiss(input),
    },
  },
}));

function result(change: Partial<UpdateCheckResult>): UpdateCheckResult {
  return {
    latestVersion: "v3.12.1",
    currentVersion: "3.12.1",
    hasUpdate: false,
    releaseUrl: "https://example.com/releases/latest",
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
  latestVersion: "v3.13.0",
  hasUpdate: true,
  level: "minor",
  entries: [{ version: "3.13.0", summary: "Adds a thing" }],
});
const CURRENT = result({});

/** A promise settled from the test. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let client: QueryClient;
const wrap = (node: ReactNode) =>
  createElement(QueryClientProvider, { client }, node);

beforeEach(() => {
  // Only the clock is faked: a failed check counts against the answers that
  // arrived before it was sent, which are told apart by their time.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  client = new QueryClient();
  calls.check.mockReset();
  calls.force.mockReset();
  calls.dismiss.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const recheckButton = () =>
  screen.getByRole("button", { name: m.admin_overview_update_recheck() });
const failure = () =>
  screen.getAllByRole("alert").find((node) => node.textContent)?.textContent;
const later = (seconds: number) =>
  vi.setSystemTime(Date.now() + seconds * 1000);

it("holds a skeleton before the first answer, then shows it", async () => {
  const first = deferred<UpdateCheckResult>();
  calls.check.mockReturnValue(first.promise);
  render(wrap(createElement(OverviewUpdate)));
  expect(document.querySelector(".overview-update-skeleton")).not.toBeNull();
  expect(screen.getByRole("status").textContent).toBe(
    m.admin_overview_update_checking(),
  );

  later(1);
  await act(async () => first.resolve(PATCH));
  await waitFor(() =>
    expect(
      screen.getByText(
        m.admin_overview_update_available({ version: "v3.12.2" }),
      ),
    ).toBeTruthy(),
  );
  expect(document.querySelector(".overview-update-skeleton")).toBeNull();
  expect(screen.getByRole("status").textContent).toBe("");
});

it("says the first check failed, and tries again on 「重新检查」", async () => {
  calls.check.mockRejectedValue(new Error("offline"));
  render(wrap(createElement(OverviewUpdate)));
  await waitFor(() => expect(failure()).toBe(m.admin_overview_update_failed()));

  const forced = deferred<UpdateCheckResult>();
  calls.force.mockReturnValue(forced.promise);
  fireEvent.click(recheckButton());
  await waitFor(() => expect(failure()).toBeUndefined());
  later(1);
  await act(async () => forced.resolve(CURRENT));
  await waitFor(() =>
    expect(
      screen.getByText(
        m.admin_overview_update_up_to_date({ current: "3.12.1" }),
      ),
    ).toBeTruthy(),
  );
});

it("says so while a forced check runs, keeping the answer and the control", async () => {
  calls.check.mockResolvedValue(PATCH);
  render(wrap(createElement(OverviewUpdate)));
  await screen.findByText(
    m.admin_overview_update_available({ version: "v3.12.2" }),
  );
  const button = recheckButton();

  const forced = deferred<UpdateCheckResult>();
  calls.force.mockReturnValue(forced.promise);
  button.focus();
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toBe(
      m.admin_overview_update_checking(),
    ),
  );
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(
    screen.getByText(m.admin_overview_update_available({ version: "v3.12.2" })),
  ).toBeTruthy();

  later(1);
  await act(async () => forced.resolve(MINOR));
  await screen.findByText("Adds a thing");
  // The control that was clicked is the one on screen, and has kept the focus.
  expect(recheckButton()).toBe(button);
  expect((button as HTMLButtonElement).disabled).toBe(false);
  expect(document.activeElement).toBe(button);
  expect(calls.check).toHaveBeenCalledTimes(1);
});

it("keeps the old answer and says so when a forced check fails after a good one", async () => {
  calls.check.mockResolvedValue(MINOR);
  render(wrap(createElement(OverviewUpdate)));
  await screen.findByText("Adds a thing");

  later(1);
  calls.force.mockRejectedValue(new Error("offline"));
  fireEvent.click(recheckButton());
  await waitFor(() =>
    expect(failure()).toBe(m.admin_overview_update_failed_kept()),
  );
  expect(screen.getByText("Adds a thing")).toBeTruthy();
});

it("shows 「当前为最新版本」 when a forced check finds the update was applied", async () => {
  calls.check.mockResolvedValue(MINOR);
  render(wrap(createElement(OverviewUpdate)));
  await screen.findByText("Adds a thing");

  later(1);
  calls.force.mockResolvedValue(CURRENT);
  fireEvent.click(recheckButton());
  await screen.findByText(
    m.admin_overview_update_up_to_date({ current: "3.12.1" }),
  );
  expect(screen.queryByText("Adds a thing")).toBeNull();
});

it("clears the failure once a later check succeeds, however it was run", async () => {
  calls.check.mockResolvedValue(PATCH);
  render(wrap(createElement(OverviewUpdate)));
  await screen.findByText(
    m.admin_overview_update_available({ version: "v3.12.2" }),
  );

  later(1);
  calls.force.mockRejectedValue(new Error("offline"));
  fireEvent.click(recheckButton());
  await waitFor(() =>
    expect(failure()).toBe(m.admin_overview_update_failed_kept()),
  );

  // A background refetch answers: no click needed for the message to go.
  later(1);
  calls.check.mockResolvedValue(MINOR);
  await act(async () => {
    await client.refetchQueries({ queryKey: ["version", "check"] });
  });
  await waitFor(() => expect(failure()).toBeUndefined());
  expect(screen.getByText("Adds a thing")).toBeTruthy();
});

it("starts the check once when the Admin opens, shared with the overview's block", async () => {
  calls.check.mockResolvedValue(PATCH);
  const { unmount } = renderHook(() => useVersionCheck(), {
    wrapper: ({ children }) => wrap(children),
  });
  await waitFor(() => expect(calls.check).toHaveBeenCalledTimes(1));

  // The overview opens on top of it: the same query, no second request.
  render(wrap(createElement(OverviewUpdate)));
  await screen.findByText(
    m.admin_overview_update_available({ version: "v3.12.2" }),
  );
  expect(calls.check).toHaveBeenCalledTimes(1);
  unmount();
});

const dismissButton = () =>
  screen.getByRole("button", { name: m.admin_overview_update_dismiss() });
const restoreButton = () =>
  screen.getByRole("button", { name: m.admin_overview_update_restore() });
const status = () => screen.getByRole("status").textContent;

it("dismisses the latest version on the server and turns the block into one line", async () => {
  calls.check.mockResolvedValue(MINOR);
  render(wrap(createElement(OverviewUpdate)));
  await screen.findByText("Adds a thing");

  const written = deferred<{ success: boolean }>();
  calls.dismiss.mockReturnValue(written.promise);
  const control = dismissButton();
  control.focus();
  fireEvent.click(control);
  await waitFor(() => expect(calls.dismiss).toHaveBeenCalledTimes(1));
  // A second press while the write is out is ignored.
  fireEvent.click(control);
  await act(async () => {});
  expect(calls.dismiss).toHaveBeenCalledTimes(1);
  expect(calls.dismiss).toHaveBeenCalledWith({ version: "v3.13.0" });
  expect(screen.getByText("Adds a thing")).toBeTruthy();

  await act(async () => written.resolve({ success: true }));
  await screen.findByText(
    m.admin_overview_update_dismissed({ version: "v3.13.0" }),
  );
  expect(screen.queryByText("Adds a thing")).toBeNull();
  expect(status()).toBe(
    m.admin_overview_update_dismiss_done({ version: "v3.13.0" }),
  );
  // Focus stays on the control, which is now the way back.
  expect(restoreButton()).toBe(control);
  expect(document.activeElement).toBe(control);
  // Nothing else was asked of the server: the answer is marked in place.
  expect(calls.check).toHaveBeenCalledTimes(1);
});

it("restores the reminder and brings the full form back", async () => {
  calls.check.mockResolvedValue({ ...MINOR, dismissed: true });
  render(wrap(createElement(OverviewUpdate)));
  await screen.findByText(
    m.admin_overview_update_dismissed({ version: "v3.13.0" }),
  );

  calls.dismiss.mockResolvedValue({ success: true });
  const control = restoreButton();
  control.focus();
  fireEvent.click(control);
  await screen.findByText("Adds a thing");
  expect(calls.dismiss).toHaveBeenCalledWith({ version: null });
  expect(status()).toBe(m.admin_overview_update_restore_done());
  expect(dismissButton()).toBe(control);
  expect(document.activeElement).toBe(control);
});

it("keeps the block as it was and says so when the write fails", async () => {
  calls.check.mockResolvedValue(MINOR);
  render(wrap(createElement(OverviewUpdate)));
  await screen.findByText("Adds a thing");

  calls.dismiss.mockRejectedValue(new Error("offline"));
  fireEvent.click(dismissButton());
  await waitFor(() =>
    expect(failure()).toBe(m.admin_overview_update_dismiss_failed()),
  );
  expect(screen.getByText("Adds a thing")).toBeTruthy();
  expect(status()).toBe("");
});

it("brings the full form back when a check finds a newer version", async () => {
  calls.check.mockResolvedValue({ ...MINOR, dismissed: true });
  render(wrap(createElement(OverviewUpdate)));
  await screen.findByText(
    m.admin_overview_update_dismissed({ version: "v3.13.0" }),
  );

  // The server reports the newer latest version as not dismissed.
  later(1);
  calls.force.mockResolvedValue(
    result({
      latestVersion: "v3.14.0",
      hasUpdate: true,
      level: "minor",
      entries: [{ version: "3.14.0", summary: "Adds another thing" }],
    }),
  );
  fireEvent.click(recheckButton());
  await screen.findByText("Adds another thing");
  expect(
    screen.queryByText(
      m.admin_overview_update_dismissed({ version: "v3.13.0" }),
    ),
  ).toBeNull();
});
