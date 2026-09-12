// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../config.schema";
import type { AdminConfigSnapshot } from "../config.admin.schema";
import { useSystemConfigForm } from "./use-system-config-form";

const state = vi.hoisted(() => ({
  snapshot: undefined as AdminConfigSnapshot | undefined,
  save: vi.fn(),
  reload: vi.fn(),
}));
vi.mock("./use-system-setting", () => ({
  useSystemSetting: () => ({
    snapshot: state.snapshot,
    saveSettings: state.save,
    reload: state.reload,
    isLoading: false,
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
beforeEach(() => {
  state.snapshot = {
    config: structuredClone(DEFAULT_CONFIG),
    revisions: { site: 2, notifications: 3 },
    secrets: { emailPasswordConfigured: true, webhookSecretConfigured: true },
    schemaVersion: 1,
  };
  state.save.mockReset();
  state.reload.mockReset();
});
afterEach(cleanup);

it("keeps local edits and their original revision when a background snapshot changes", async () => {
  const { result, rerender } = renderHook(() => useSystemConfigForm("site"));
  await waitFor(() => expect(result.current.baseline.revisions.site).toBe(2));
  act(() =>
    result.current.methods.setValue("site.title", "Local", {
      shouldDirty: true,
    }),
  );
  state.snapshot = {
    ...state.snapshot!,
    config: {
      ...state.snapshot!.config,
      site: { ...state.snapshot!.config.site, title: "Remote" },
    },
    revisions: { site: 3, notifications: 3 },
  };
  rerender();
  expect(result.current.methods.getValues("site.title")).toBe("Local");
  expect(result.current.baseline.revisions.site).toBe(2);
});
it("saves the selected section and preserves the other section draft", async () => {
  const { result } = renderHook(() => useSystemConfigForm("site"));
  await waitFor(() => expect(result.current.baseline.revisions.site).toBe(2));
  act(() => {
    result.current.methods.setValue("site.title", "Local", {
      shouldDirty: true,
    });
    result.current.methods.setValue("email.senderName", "Unsubmitted", {
      shouldDirty: true,
    });
  });
  state.save.mockResolvedValue({
    ...state.snapshot!,
    config: {
      ...state.snapshot!.config,
      site: { ...state.snapshot!.config.site, title: "Local" },
    },
    revisions: { site: 3, notifications: 3 },
  });
  await act(async () => {
    await result.current.onSubmit();
  });
  expect(state.save.mock.calls[0][0]).toMatchObject({
    section: "site",
    expectedRevision: 2,
    site: { title: "Local" },
  });
  expect(state.save.mock.calls[0][0]).not.toHaveProperty("email");
  expect(result.current.methods.getValues("email.senderName")).toBe(
    "Unsubmitted",
  );
  expect(result.current.dirtySections).toEqual({
    site: false,
    notifications: true,
  });
  expect(result.current.baseline.revisions.site).toBe(3);
});
it("retains edits after a conflict and only discards the requested section on reload", async () => {
  const { result } = renderHook(() => useSystemConfigForm("site"));
  await waitFor(() => expect(result.current.baseline.revisions.site).toBe(2));
  act(() => {
    result.current.methods.setValue("site.title", "Local", {
      shouldDirty: true,
    });
    result.current.methods.setValue("email.senderName", "Keep me", {
      shouldDirty: true,
    });
  });
  state.save.mockRejectedValue({ code: "CONFIG_CONFLICT" });
  await act(async () => {
    await result.current.onSubmit();
  });
  expect(result.current.conflict).toBe(true);
  expect(result.current.methods.getValues("site.title")).toBe("Local");
  state.reload.mockResolvedValue({
    data: {
      ...state.snapshot!,
      config: {
        ...state.snapshot!.config,
        site: { ...state.snapshot!.config.site, title: "Remote" },
      },
      revisions: { site: 4, notifications: 3 },
    },
    isError: false,
  });
  await act(async () => {
    await result.current.discardSection();
  });
  expect(result.current.methods.getValues("site.title")).toBe("Remote");
  expect(result.current.methods.getValues("email.senderName")).toBe("Keep me");
  expect(result.current.baseline.revisions.site).toBe(4);
});
