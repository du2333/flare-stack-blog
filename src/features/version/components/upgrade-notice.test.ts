// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { UpgradeNotice as Notice } from "@/features/version/upgrade-notice.schema";
import { m } from "@/paraglide/messages";
import { UpgradeNotice } from "./upgrade-notice";

const calls = vi.hoisted(() => ({ read: vi.fn(), acknowledge: vi.fn() }));

vi.mock("@/features/version/queries", () => ({
  upgradeNoticeQuery: {
    queryKey: ["version", "upgrade-notice"],
    queryFn: () => calls.read(),
    staleTime: Infinity,
    retry: false,
  },
}));
vi.mock("@/lib/orpc", () => ({
  orpcClient: { version: { acknowledgeUpgrade: () => calls.acknowledge() } },
}));
// Unmount the sheet as soon as it closes, and render it as on a wide screen.
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
  useMediaQuery: () => false,
}));

const LINE: Notice = {
  version: "3.12.1",
  entries: [{ version: "3.12.1", summary: "Fixes a thing" }],
};
const ITEMS: Notice = {
  version: "3.14.0",
  entries: [
    {
      version: "3.13.0",
      summary: "Adds the first thing",
      after: [
        { id: "a", text: "Set the build command" },
        { id: "b", text: "Fill in the site id" },
      ],
    },
    { version: "3.13.1", summary: "Fixes the first thing" },
    {
      version: "3.14.0",
      summary: "Adds the second thing",
      after: [{ id: "c", text: "Check the theme" }],
    },
  ],
};

let client: QueryClient;
beforeEach(() => {
  client = new QueryClient();
  calls.read.mockReset();
  calls.acknowledge.mockReset();
});
afterEach(cleanup);

/** The notice under a stand-in for the update line, whose control takes focus. */
function mount(notice: Notice | null) {
  calls.read.mockResolvedValue({ notice });
  const page: ReactNode = createElement(
    QueryClientProvider,
    { client },
    createElement(
      "div",
      null,
      createElement(
        "div",
        { className: "overview-update" },
        createElement("button", { "data-notices-anchor": "" }, "Anchor"),
      ),
      createElement(UpgradeNotice),
    ),
  );
  return render(page);
}

const line = () => document.querySelector<HTMLElement>(".overview-upgrade")!;
const viewButton = () =>
  within(line()).getByRole("button", { name: m.admin_overview_update_view() });
const ackIn = (scope: HTMLElement) =>
  within(scope).getByRole("button", { name: m.admin_overview_upgrade_ack() });
const words = () =>
  line().querySelector(".overview-line-words > span:first-child")?.textContent;

it("renders nothing when there is nothing to show", async () => {
  mount(null);
  await waitFor(() => expect(calls.read).toHaveBeenCalled());
  await Promise.resolve();
  expect(document.querySelector(".overview-upgrade")).toBeNull();
  expect(screen.getByRole("status").textContent).toBe("");
});

it("is one line with 「知道了」 only when no version has an item", async () => {
  mount(LINE);
  await screen.findByText(
    m.admin_overview_upgrade_title({ version: "v3.12.1" }),
  );
  expect(
    within(line())
      .getAllByRole("button")
      .map((button) => button.textContent),
  ).toEqual([m.admin_overview_upgrade_ack()]);
  expect(screen.queryByText("Fixes a thing")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("counts the items on the line, which has 「查看」 and 「知道了」", async () => {
  mount(ITEMS);
  await screen.findByText(
    m.admin_overview_upgrade_title_todo({ version: "v3.14.0", count: 3 }),
  );
  expect(
    within(line())
      .getAllByRole("button")
      .map((button) => button.textContent),
  ).toEqual([m.admin_overview_update_view(), m.admin_overview_upgrade_ack()]);
  // The versions are not listed on the line.
  expect(document.querySelector("ol, ul")).toBeNull();
  expect(screen.queryByText("Adds the first thing")).toBeNull();
});

it("opens a sheet listing each version with its summary and items, and Escape returns focus", async () => {
  mount(ITEMS);
  await screen.findByText(
    m.admin_overview_upgrade_title_todo({ version: "v3.14.0", count: 3 }),
  );
  const control = viewButton();
  expect(control.getAttribute("aria-haspopup")).toBe("dialog");
  expect(control.getAttribute("aria-expanded")).toBe("false");
  control.focus();
  fireEvent.click(control);
  expect(control.getAttribute("aria-expanded")).toBe("true");

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("heading", { level: 2 }).textContent).toBe(
    m.admin_overview_upgrade_title({ version: "v3.14.0" }),
  );
  expect(
    [...dialog.querySelectorAll(".overview-sheet-list > li")].map(
      (row) => row.textContent,
    ),
  ).toEqual([
    "v3.13.0Adds the first thingSet the build commandFill in the site id",
    "v3.13.1Fixes the first thing",
    "v3.14.0Adds the second thingCheck the theme",
  ]);
  expect(ackIn(dialog)).toBeTruthy();

  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(control);
});

it.each(["line", "sheet"] as const)(
  "acknowledges from the %s, removes the notice and focuses the update line's control",
  async (from) => {
    mount(ITEMS);
    await screen.findByText(
      m.admin_overview_upgrade_title_todo({ version: "v3.14.0", count: 3 }),
    );
    calls.acknowledge.mockResolvedValue({ success: true });
    if (from === "sheet") {
      fireEvent.click(viewButton());
      const button = ackIn(screen.getByRole("dialog"));
      button.focus();
      fireEvent.click(button);
    } else {
      const button = ackIn(line());
      button.focus();
      fireEvent.click(button);
    }
    await waitFor(() =>
      expect(document.querySelector(".overview-upgrade")).toBeNull(),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(calls.acknowledge).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe(
      m.admin_overview_upgrade_acked({ version: "v3.14.0" }),
    );
    expect(document.activeElement).toBe(screen.getByText("Anchor"));
  },
);

it("says on the line that the acknowledgement failed, and keeps the notice", async () => {
  mount(LINE);
  await screen.findByText(
    m.admin_overview_upgrade_title({ version: "v3.12.1" }),
  );
  calls.acknowledge.mockRejectedValue(new Error("offline"));
  fireEvent.click(ackIn(line()));
  await waitFor(() =>
    expect(line().querySelector(".overview-line-failure")?.textContent).toBe(
      m.admin_overview_upgrade_failed(),
    ),
  );
  expect(words()).toBe(m.admin_overview_upgrade_title({ version: "v3.12.1" }));
});

it("says inside the sheet that the acknowledgement failed, and keeps it open", async () => {
  mount(ITEMS);
  await screen.findByText(
    m.admin_overview_upgrade_title_todo({ version: "v3.14.0", count: 3 }),
  );
  calls.acknowledge.mockRejectedValue(new Error("offline"));
  fireEvent.click(viewButton());
  fireEvent.click(ackIn(screen.getByRole("dialog")));
  await waitFor(() =>
    expect(document.querySelector(".overview-sheet-failure")?.textContent).toBe(
      m.admin_overview_upgrade_failed(),
    ),
  );
  expect(screen.getByRole("dialog")).toBeTruthy();
  // The line does not repeat it while the sheet is open.
  expect(line().querySelector(".overview-line-failure")?.textContent).toBe("");
});

it("shows text from the notes as text, never as markup or a link", async () => {
  mount({
    version: "3.14.0",
    entries: [
      {
        version: "3.14.0",
        summary: "<img src=x onerror=alert(1)> **bold**",
        after: [{ id: "a", text: "<b>run</b> [this](https://example.com)" }],
      },
    ],
  });
  await screen.findByText(
    m.admin_overview_upgrade_title_todo({ version: "v3.14.0", count: 1 }),
  );
  fireEvent.click(viewButton());
  expect(document.querySelector("img")).toBeNull();
  expect(document.querySelectorAll("b")).toHaveLength(1);
  expect(document.querySelector("a")).toBeNull();
  expect(
    screen.getByText("<b>run</b> [this](https://example.com)"),
  ).toBeTruthy();
});
