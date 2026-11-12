// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { AgentSkillSection } from "./agent-skill-section";

const pairing = vi.hoisted(() => ({
  generate: vi.fn(),
  status: vi.fn(),
  cancel: vi.fn(),
}));
const authKeys = vi.hoisted(() => ({ list: vi.fn(), delete: vi.fn() }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// Close the menu at once; exit motion is not under test.
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
}));
vi.mock("@/lib/orpc", () => ({
  orpcClient: { pairing: { admin: pairing } },
}));
vi.mock("@/lib/auth/auth-client", () => ({
  getAuthClient: () => ({ apiKey: authKeys }),
}));
vi.mock("@/features/config/queries", () => ({
  siteDomainQuery: {
    queryKey: ["site-domain"],
    queryFn: async () => "blog.example.com",
  },
}));
vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
  Link: ({ children }: { children: ReactNode }) =>
    createElement("a", null, children),
}));

// The pairing operations answer over HTTP, where a date is an ISO string and
// mutation results are not revived: the mocks answer the way the network does.
const connectedAt = new Date("2026-10-30T08:00:00.000Z");
const expiresAt = "2026-10-30T08:10:00.000Z";
const waiting = { state: "waiting", expiresAt };
const connected = {
  state: "connected",
  agent: {
    name: "Claude Code",
    apiKeyId: "key-1",
    connectedAt: connectedAt.toISOString(),
  },
};

const pairedKey = {
  id: "key-1",
  name: "Claude Code · 2026-10-30",
  start: "fsb_ab",
  createdAt: connectedAt,
  lastRequest: "2026-10-30T09:30:00.000Z",
  metadata: { source: "pairing", agentName: "Claude Code" },
};
const manualKey = {
  id: "key-2",
  name: "CI script",
  start: "fsb_cd",
  createdAt: connectedAt,
  lastRequest: null,
  metadata: null,
};

function mountPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["site-domain"], "blog.example.com");
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AgentSkillSection),
    ),
  );
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

/** Lets a result that arrived at the last tick reach the rendered page. */
async function settle() {
  await act(async () => {
    for (let step = 0; step < 3; step++) {
      await vi.advanceTimersByTimeAsync(50);
    }
  });
}

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    // Query results reach React through a zero-delay timer, and may queue another.
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => {
  // The copy is pinned in Chinese; jsdom would otherwise prefer English.
  document.cookie = "LOCALE=zh";
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
  pairing.status.mockResolvedValue({ state: "none" });
  pairing.generate.mockResolvedValue({
    code: "ABCD-EFGH",
    expiresAt,
  });
  pairing.cancel.mockResolvedValue(undefined);
  authKeys.list.mockResolvedValue({ data: { apiKeys: [] }, error: null });
  authKeys.delete.mockResolvedValue({ data: {}, error: null });
});
afterEach(() => {
  document.cookie = "LOCALE=; max-age=0";
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it("lays out the install, pair and try steps in order", async () => {
  mountPage();
  await flush();
  const headings = screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent);
  expect(headings).toEqual([
    m.agent_skill_step_install(),
    m.agent_skill_step_pair(),
    m.agent_skill_step_try(),
    m.agent_skill_agents_title(),
  ]);
});

it("shows the install command with a copy button and the zip link pinned to this version", async () => {
  mountPage();
  await flush();
  const command = document.querySelector("code");
  expect(command?.textContent).toBe(
    `npx skills add https://github.com/du2333/flare-stack-blog/tree/v${__APP_VERSION__}/.agents/skills/flare-stack-blog -g`,
  );
  expect(
    screen.getAllByRole("button", { name: m.common_copy_code() }),
  ).toHaveLength(1);
  const download = screen.getByRole("link", {
    name: m.agent_skill_download({ version: __APP_VERSION__ }),
  });
  expect(download.getAttribute("href")).toBe(
    `https://github.com/du2333/flare-stack-blog/releases/download/v${__APP_VERSION__}/flare-stack-blog-skills-v${__APP_VERSION__}.zip`,
  );
});

it("offers the four example instructions, each with a copy button, and the draft note", async () => {
  mountPage();
  await flush();
  for (const text of [
    "列出最近的草稿",
    "把本地的 notes.md 整理成一篇草稿，图片一并上传",
    "检查最近一篇草稿有哪些未发布的修改，确认后发布",
    "为最近三篇文章补写摘要，保存为草稿",
  ]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
  expect(
    screen.getAllByRole("button", { name: m.agent_skill_try_copy() }),
  ).toHaveLength(4);
  expect(
    screen.getByText(
      "agent 的修改先保存为草稿，发布后才会出现在已发布页面；分类与标签的新建、改名、删除即时生效。",
    ),
  ).toBeTruthy();
});

it("starts with a generate button and no polling when there is no code", async () => {
  mountPage();
  await flush();
  expect(
    screen.getByRole("button", { name: m.agent_skill_pair_generate() }),
  ).toBeTruthy();
  await tick(6000);
  expect(pairing.status).toHaveBeenCalledTimes(1);
});

it("treats a cancelled code like no code", async () => {
  pairing.status.mockResolvedValue({ state: "cancelled" });
  mountPage();
  await flush();
  expect(
    screen.getByRole("button", { name: m.agent_skill_pair_generate() }),
  ).toBeTruthy();
});

it("generates a code and shows the sentence for the agent with the configured domain", async () => {
  mountPage();
  await flush();
  pairing.status.mockResolvedValue(waiting);
  fireEvent.click(
    screen.getByRole("button", { name: m.agent_skill_pair_generate() }),
  );
  await flush();
  expect(pairing.generate).toHaveBeenCalledTimes(1);
  expect(
    screen.getByText(
      "使用 flare-stack-blog skill 连接 https://blog.example.com，配对码：ABCD-EFGH",
    ),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: m.agent_skill_pair_copy() }),
  ).toBeTruthy();
  expect(screen.getByText(m.agent_skill_pair_waiting())).toBeTruthy();
});

it("says until when the waiting code is valid", async () => {
  pairing.status.mockResolvedValue(waiting);
  mountPage();
  await flush();
  expect(
    screen.getByText(
      m.agent_skill_pair_valid_until({ time: new Date(expiresAt) }),
    ),
  ).toBeTruthy();
  expect(screen.getByText(/^有效至 \d{2}:\d{2}$/)).toBeTruthy();
});

it("writes the code as ABCD-EFGH whatever case or separator the server uses", async () => {
  pairing.generate.mockResolvedValue({ code: "abcdefgh", expiresAt });
  pairing.status.mockResolvedValue(waiting);
  mountPage();
  await flush();
  fireEvent.click(
    screen.getByRole("button", { name: m.agent_skill_pair_regenerate() }),
  );
  await flush();
  expect(screen.getByText(/配对码：ABCD-EFGH$/)).toBeTruthy();
});

it("shows the waiting state without a code after a reload, since the server keeps none", async () => {
  pairing.status.mockResolvedValue(waiting);
  mountPage();
  await flush();
  expect(screen.getByText(m.agent_skill_pair_code_hidden())).toBeTruthy();
  expect(screen.getByText(m.agent_skill_pair_waiting())).toBeTruthy();
  expect(screen.queryByText(/配对码：/)).toBeNull();
  expect(
    screen.getByRole("button", { name: m.agent_skill_pair_regenerate() }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: m.agent_skill_pair_cancel() }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: m.agent_skill_pair_copy() }),
  ).toBeNull();
});

it("does not keep the code in any storage", async () => {
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  mountPage();
  await flush();
  pairing.status.mockResolvedValue(waiting);
  fireEvent.click(
    screen.getByRole("button", { name: m.agent_skill_pair_generate() }),
  );
  await flush();
  expect(screen.getByText(/配对码：ABCD-EFGH$/)).toBeTruthy();
  expect(setItem).not.toHaveBeenCalled();
  expect(document.cookie).not.toContain("ABCD");
});

it("does not show a code that another tab replaced", async () => {
  mountPage();
  await flush();
  pairing.status.mockResolvedValue(waiting);
  fireEvent.click(
    screen.getByRole("button", { name: m.agent_skill_pair_generate() }),
  );
  await flush();
  expect(screen.getByText(/配对码：ABCD-EFGH$/)).toBeTruthy();

  pairing.status.mockResolvedValue({
    state: "waiting",
    expiresAt: "2026-10-30T08:12:00.000Z",
  });
  await tick(2000);
  await settle();
  expect(screen.queryByText(/配对码：/)).toBeNull();
  expect(screen.getByText(m.agent_skill_pair_code_hidden())).toBeTruthy();
});

it("polls every 2 seconds while a code is waiting and stops once an agent connects", async () => {
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [pairedKey] },
    error: null,
  });
  pairing.status.mockResolvedValue(waiting);
  mountPage();
  await flush();
  expect(pairing.status).toHaveBeenCalledTimes(1);
  await tick(1999);
  expect(pairing.status).toHaveBeenCalledTimes(1);
  await tick(1);
  expect(pairing.status).toHaveBeenCalledTimes(2);

  pairing.status.mockResolvedValue(connected);
  await tick(2000);
  expect(pairing.status).toHaveBeenCalledTimes(3);
  await settle();
  expect(
    screen.getByText(
      m.agent_skill_pair_connected({
        name: "Claude Code",
        time: formatDate(connectedAt, { includeTime: true }),
      }),
    ),
  ).toBeTruthy();
  await tick(6000);
  expect(pairing.status).toHaveBeenCalledTimes(3);
});

it("does not poll while the page is hidden", async () => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  pairing.status.mockResolvedValue(waiting);
  mountPage();
  await flush();
  await tick(6000);
  expect(pairing.status).toHaveBeenCalledTimes(1);
});

it("reloads the connected agent into the key list", async () => {
  pairing.status.mockResolvedValue(waiting);
  authKeys.list.mockResolvedValue({ data: { apiKeys: [] }, error: null });
  mountPage();
  await flush();
  expect(authKeys.list).toHaveBeenCalledTimes(1);
  pairing.status.mockResolvedValue(connected);
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [pairedKey] },
    error: null,
  });
  await tick(2000);
  await settle();
  expect(authKeys.list).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("table")).toBeTruthy();
  expect(
    within(screen.getByRole("table")).getByText("Claude Code"),
  ).toBeTruthy();
});

it("cancels a waiting code and returns to the start", async () => {
  pairing.status.mockResolvedValue(waiting);
  mountPage();
  await flush();
  pairing.status.mockResolvedValue({ state: "cancelled" });
  fireEvent.click(
    screen.getByRole("button", { name: m.agent_skill_pair_cancel() }),
  );
  await flush();
  expect(pairing.cancel).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("button", { name: m.agent_skill_pair_generate() }),
  ).toBeTruthy();
});

it("regenerates from a waiting code", async () => {
  pairing.status.mockResolvedValue(waiting);
  mountPage();
  await flush();
  fireEvent.click(
    screen.getByRole("button", { name: m.agent_skill_pair_regenerate() }),
  );
  await flush();
  expect(pairing.generate).toHaveBeenCalledTimes(1);
});

it("says an expired code has expired and offers a new one", async () => {
  pairing.status.mockResolvedValue({ state: "expired" });
  mountPage();
  await flush();
  expect(screen.getByText("配对码已过期")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "重新生成" }));
  await flush();
  expect(pairing.generate).toHaveBeenCalledTimes(1);
  await tick(6000);
  expect(pairing.status).toHaveBeenCalledTimes(2);
});

it("shows which agent connected and when", async () => {
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [pairedKey] },
    error: null,
  });
  pairing.status.mockResolvedValue(connected);
  mountPage();
  await flush();
  expect(
    screen.getByText(
      `已连接：Claude Code，${formatDate(connectedAt, { includeTime: true })}`,
    ),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "不是此 agent？撤销" }),
  ).toBeTruthy();
});

it("asks before revoking, then deletes the key the code issued", async () => {
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [pairedKey] },
    error: null,
  });
  pairing.status.mockResolvedValue(connected);
  mountPage();
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "不是此 agent？撤销" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toContain(
    m.agent_skill_pair_revoke_desc({ name: "Claude Code" }),
  );
  expect(authKeys.delete).not.toHaveBeenCalled();
  authKeys.list.mockResolvedValue({ data: { apiKeys: [] }, error: null });
  fireEvent.click(
    within(dialog).getByRole("button", {
      name: m.agent_skill_pair_revoke_confirm(),
    }),
  );
  await flush();
  await settle();
  expect(authKeys.delete).toHaveBeenCalledWith({ keyId: "key-1" });
  expect(toast.success).toHaveBeenCalledWith(
    m.agent_skill_pair_revoked({ name: "Claude Code" }),
  );
  // Only the revoke toast, not the generic "key deleted" one as well.
  expect(toast.success).toHaveBeenCalledTimes(1);
  // Status still says connected; the missing key sends the tab back to the start.
  expect(
    screen.queryByRole("button", { name: "不是此 agent？撤销" }),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: m.agent_skill_pair_generate() }),
  ).toBeTruthy();
});

it("starts over when the connected agent's key was deleted elsewhere", async () => {
  pairing.status.mockResolvedValue(connected);
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [manualKey] },
    error: null,
  });
  mountPage();
  await flush();
  await settle();
  expect(screen.queryByText(/已连接：/)).toBeNull();
  expect(
    screen.getByRole("button", { name: m.agent_skill_pair_generate() }),
  ).toBeTruthy();
});

it("keeps showing the connected agent when the key list cannot be read", async () => {
  pairing.status.mockResolvedValue(connected);
  authKeys.list.mockResolvedValue({ data: null, error: new Error("offline") });
  mountPage();
  await flush();
  await settle();
  expect(screen.getByText(/已连接：Claude Code/)).toBeTruthy();
});

it("leaves the key alone when the revoke confirmation is dismissed", async () => {
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [pairedKey] },
    error: null,
  });
  pairing.status.mockResolvedValue(connected);
  mountPage();
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "不是此 agent？撤销" }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: m.common_cancel(),
    }),
  );
  await tick(300);
  expect(authKeys.delete).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "不是此 agent？撤销" }),
  ).toBeTruthy();
});

it("lists only the agents connected by pairing, with their last use", async () => {
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [pairedKey, manualKey] },
    error: null,
  });
  mountPage();
  await flush();
  const list = screen.getByRole("table");
  // The agent's name from the metadata, not the key's "<agent> · <date>".
  expect(within(list).getByText("Claude Code")).toBeTruthy();
  expect(within(list).queryByText(pairedKey.name)).toBeNull();
  expect(within(list).queryByText(manualKey.name)).toBeNull();
  expect(
    within(list).getByText(
      formatDate(pairedKey.lastRequest, { includeTime: true }),
    ),
  ).toBeTruthy();
});

it("falls back to the key name when the metadata has no agent name", async () => {
  authKeys.list.mockResolvedValue({
    data: {
      apiKeys: [{ ...pairedKey, metadata: { source: "pairing" } }],
    },
    error: null,
  });
  mountPage();
  await flush();
  expect(
    within(screen.getByRole("table")).getByText(pairedKey.name),
  ).toBeTruthy();
});

it("says a paired agent has not been used yet", async () => {
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [{ ...pairedKey, lastRequest: null }] },
    error: null,
  });
  mountPage();
  await flush();
  expect(screen.getByText(m.agent_skill_agents_never_used())).toBeTruthy();
});

it("shows an empty list when no key came from pairing", async () => {
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [manualKey] },
    error: null,
  });
  mountPage();
  await flush();
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.getByText(m.agent_skill_agents_empty())).toBeTruthy();
});

it("deletes a paired agent's key after confirmation", async () => {
  authKeys.list.mockResolvedValue({
    data: { apiKeys: [pairedKey] },
    error: null,
  });
  mountPage();
  await flush();
  // The row's overflow menu holds 撤销.
  fireEvent.click(
    within(screen.getByRole("table")).getByRole("button", {
      name: m.settings_api_keys_row_actions({ name: "Claude Code" }),
    }),
  );
  await flush();
  fireEvent.click(
    screen.getByRole("menuitem", { name: m.settings_api_keys_delete() }),
  );
  await flush();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toContain(
    m.settings_api_keys_delete_desc({ name: "Claude Code" }),
  );
  expect(authKeys.delete).not.toHaveBeenCalled();
  fireEvent.click(
    within(dialog).getByRole("button", {
      name: m.settings_api_keys_delete_confirm(),
    }),
  );
  await flush();
  expect(authKeys.delete).toHaveBeenCalledWith({ keyId: "key-1" });
});

it("offers a retry when the pairing status cannot be read", async () => {
  pairing.status.mockRejectedValueOnce(new Error("offline"));
  mountPage();
  await flush();
  expect(screen.getByText(m.agent_skill_pair_load_failed())).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: m.settings_design_retry() }),
  );
  await flush();
  expect(
    screen.getByRole("button", { name: m.agent_skill_pair_generate() }),
  ).toBeTruthy();
});
