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
import { AdminChromeProvider } from "@/components/admin/admin-chrome";
import { m } from "@/paraglide/messages";
import { ApiKeySettingsSection } from "./api-key-settings-section";

const authKeys = vi.hoisted(() => ({ list: vi.fn(), delete: vi.fn() }));

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// Close the menu at once; exit motion is not under test.
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
}));
vi.mock("@/lib/auth/auth-client", () => ({
  getAuthClient: () => ({ apiKey: authKeys }),
}));
vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
  Link: ({ children, to }: { children: ReactNode; to: string }) =>
    createElement("a", { href: to }, children),
}));

const createdAt = "2026-10-30T08:00:00.000Z";

beforeEach(() => {
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
  authKeys.list.mockResolvedValue({
    data: {
      apiKeys: [
        {
          id: "key-1",
          name: "Claude Code · 2026-10-30",
          start: "fsb_ab",
          createdAt,
          metadata: { source: "pairing", agentName: "Claude Code" },
        },
        {
          id: "key-2",
          name: "CI script",
          start: "fsb_cd",
          createdAt,
          metadata: null,
        },
        {
          id: "key-3",
          name: "Other metadata",
          start: "fsb_ef",
          createdAt,
          metadata: { createdBy: "pairing" },
        },
      ],
    },
    error: null,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function mountPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        AdminChromeProvider,
        null,
        createElement(ApiKeySettingsSection),
      ),
    ),
  );
}

it("marks only the keys whose metadata says pairing created them", async () => {
  mountPage();
  const rows = await screen.findAllByRole("row");
  const badge = m.settings_api_keys_paired_badge();
  const cell = (name: string) =>
    rows.find((row) => within(row).queryByText(name))!;
  expect(
    within(cell("Claude Code · 2026-10-30")).getByText(badge),
  ).toBeTruthy();
  expect(within(cell("Other metadata")).queryByText(badge)).toBeNull();
  expect(within(cell("CI script")).queryByText(badge)).toBeNull();
});

it("lists each key with its prefix and when it was created and last used, and revokes from the row's menu", async () => {
  authKeys.delete.mockResolvedValue({ data: {}, error: null });
  mountPage();
  const rows = await screen.findAllByRole("row");
  // The header row, then one row per key.
  expect(rows).toHaveLength(4);
  const row = rows.find((item) => within(item).queryByText("CI script"))!;
  expect(within(row).getByText("fsb_cd…")).toBeTruthy();
  expect(
    within(row).getAllByText(m.settings_api_keys_never_used()).length,
  ).toBeGreaterThan(0);
  fireEvent.click(
    within(row).getByRole("button", {
      name: m.settings_api_keys_row_actions({ name: "CI script" }),
    }),
  );
  fireEvent.click(
    await screen.findByRole("menuitem", { name: m.settings_api_keys_delete() }),
  );
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: m.settings_api_keys_delete_confirm(),
    }),
  );
  await waitFor(() =>
    expect(authKeys.delete).toHaveBeenCalledWith({ keyId: "key-2" }),
  );
});

it("says so in one sentence, with a create button, when there are no keys", async () => {
  authKeys.list.mockResolvedValue({ data: { apiKeys: [] }, error: null });
  mountPage();
  expect(await screen.findByText(m.settings_api_keys_empty())).toBeTruthy();
  expect(
    screen.getByRole("button", { name: m.settings_api_keys_create() }),
  ).toBeTruthy();
});

it("points to the Agent Skill tab instead of carrying the install hint", async () => {
  mountPage();
  await screen.findAllByRole("row");
  const link = screen.getByRole("link", {
    name: m.settings_api_keys_agent_pointer_link(),
  });
  expect(link.getAttribute("href")).toBe("/admin/access/agent-skill");
  // Only the words are linked; the brackets and "tab" stay outside.
  expect(link.textContent).toBe("Agent Skill");
  expect(document.body.textContent).not.toContain("npx skills add");
});
