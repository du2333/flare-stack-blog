// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createElement } from "react";
import { FormProvider } from "react-hook-form";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { THEMES } from "@/features/theme/themes";
import { m } from "@/paraglide/messages";
import { ThemePicker } from "../components/admin/theme-picker";
import { DEFAULT_CONFIG } from "../config.schema";
import type { AdminConfigSnapshot } from "../config.admin.schema";
import type { ConfigFormValues } from "../components/admin/config-editing";
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
// Site Config accepts the fixture Theme, as in a THEME_FIXTURE=1 build.
vi.mock("@/features/theme/theme-ids", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/theme/theme-ids")>();
  const THEME_IDS = [...actual.BUILT_IN_THEME_IDS, "fixture"];
  return {
    ...actual,
    THEME_IDS,
    isThemeId: (value: unknown) => THEME_IDS.some((id) => id === value),
  };
});
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
const presentationSite = {
  bannerFocus: { x: 10, y: 80 },
  brandMark: "avatar" as const,
  tagline: "Saved tagline",
  primaryHue: 200,
  theme: { id: "classic" as const, options: { classic: { kept: true } } },
};
const identitySite = {
  title: "Saved title",
  author: "Saved author",
  description: "Saved description",
};

function loadSavedSite() {
  state.snapshot = {
    ...state.snapshot!,
    config: {
      ...state.snapshot!.config,
      site: {
        ...state.snapshot!.config.site,
        ...identitySite,
        ...presentationSite,
      },
    },
  };
  return state.snapshot.config.site!;
}

it("saves the site page's fields in the Site Config as loaded, leaving the presentation fields untouched", async () => {
  const loaded = loadSavedSite();
  const { result } = renderHook(() => useSystemConfigForm("site"));
  await waitFor(() => expect(result.current.baseline.revisions.site).toBe(2));
  act(() => {
    result.current.methods.setValue("site.title", "New title", {
      shouldDirty: true,
    });
    // Not a field of this page: a stray edit never reaches the save.
    result.current.methods.setValue("site.primaryHue", 30, {
      shouldDirty: true,
    });
    result.current.methods.setValue("site.tagline", "Stray", {
      shouldDirty: true,
    });
  });
  state.save.mockResolvedValue({
    ...state.snapshot!,
    revisions: { site: 3, notifications: 3 },
  });
  await act(async () => {
    await result.current.onSubmit();
  });
  const saved = state.save.mock.calls[0][0];
  expect(saved).toMatchObject({ section: "site", expectedRevision: 2 });
  expect(saved.site).toMatchObject({
    ...identitySite,
    title: "New title",
    ...presentationSite,
    bannerImage: loaded.bannerImage,
    avatar: loaded.avatar,
  });
});

it("saves the personalize page's fields in the Site Config as loaded, leaving the identity fields untouched", async () => {
  const loaded = loadSavedSite();
  const { result } = renderHook(() => useSystemConfigForm("personalize"));
  await waitFor(() => expect(result.current.baseline.revisions.site).toBe(2));
  act(() => {
    result.current.methods.setValue("site.primaryHue", 30, {
      shouldDirty: true,
    });
    result.current.methods.setValue("site.brandMark", "none", {
      shouldDirty: true,
    });
    result.current.methods.setValue(
      "site.bannerFocus",
      { x: 25, y: 60 },
      { shouldDirty: true },
    );
    result.current.methods.setValue("site.title", "Stray", {
      shouldDirty: true,
    });
  });
  state.save.mockResolvedValue({
    ...state.snapshot!,
    revisions: { site: 3, notifications: 3 },
  });
  await act(async () => {
    await result.current.onSubmit();
  });
  const saved = state.save.mock.calls[0][0];
  expect(saved).toMatchObject({ section: "site", expectedRevision: 2 });
  expect(saved.site).toMatchObject({
    ...identitySite,
    ...presentationSite,
    primaryHue: 30,
    brandMark: "none",
    bannerFocus: { x: 25, y: 60 },
    bannerImage: loaded.bannerImage,
    avatar: loaded.avatar,
    navLinks: loaded.navLinks,
    social: loaded.social,
    icons: loaded.icons,
  });
});

it("marks the page dirty only by the fields it owns", async () => {
  const personalize = renderHook(() => useSystemConfigForm("personalize"));
  const site = renderHook(() => useSystemConfigForm("site"));
  await waitFor(() =>
    expect(personalize.result.current.baseline.revisions.site).toBe(2),
  );
  await waitFor(() =>
    expect(site.result.current.baseline.revisions.site).toBe(2),
  );
  expect(personalize.result.current.dirtySections.site).toBe(false);

  act(() => {
    personalize.result.current.methods.setValue("site.brandMark", "siteIcon", {
      shouldDirty: true,
    });
    site.result.current.methods.setValue("site.brandMark", "siteIcon", {
      shouldDirty: true,
    });
  });
  expect(personalize.result.current.sectionDirty).toBe(true);
  expect(site.result.current.sectionDirty).toBe(false);
  act(() => {
    personalize.result.current.methods.setValue("site.brandMark", "default", {
      shouldDirty: true,
    });
  });
  expect(personalize.result.current.dirtySections.site).toBe(false);

  act(() => {
    personalize.result.current.methods.setValue("site.title", "Elsewhere", {
      shouldDirty: true,
    });
  });
  expect(personalize.result.current.sectionDirty).toBe(false);
});

it("on a conflict keeps what is typed, and reloading takes in the other page's save and keeps it", async () => {
  loadSavedSite();
  const { result } = renderHook(() => useSystemConfigForm("personalize"));
  await waitFor(() => expect(result.current.baseline.revisions.site).toBe(2));
  act(() =>
    result.current.methods.setValue("site.tagline", "Typed here", {
      shouldDirty: true,
    }),
  );
  // The site page saved first: the revision has moved.
  state.save.mockRejectedValueOnce({ code: "CONFIG_CONFLICT" });
  await act(async () => {
    await result.current.onSubmit();
  });
  expect(result.current.conflict).toBe(true);
  expect(result.current.methods.getValues("site.tagline")).toBe("Typed here");
  expect(result.current.sectionDirty).toBe(true);
  expect(state.save.mock.calls[0][0].expectedRevision).toBe(2);

  state.reload.mockResolvedValue({
    data: {
      ...state.snapshot!,
      config: {
        ...state.snapshot!.config,
        site: {
          ...state.snapshot!.config.site,
          title: "Saved on the site page",
          tagline: "Saved tagline, replaced",
        },
      },
      revisions: { site: 3, notifications: 3 },
    },
    isError: false,
  });
  await act(async () => {
    await result.current.reloadSection();
  });
  expect(result.current.conflict).toBe(false);
  expect(result.current.baseline.revisions.site).toBe(3);
  expect(result.current.methods.getValues("site.title")).toBe(
    "Saved on the site page",
  );
  expect(result.current.methods.getValues("site.tagline")).toBe("Typed here");
  expect(result.current.sectionDirty).toBe(true);

  state.save.mockResolvedValue({
    ...state.snapshot!,
    revisions: { site: 4, notifications: 3 },
  });
  await act(async () => {
    await result.current.onSubmit();
  });
  expect(state.save.mock.calls[1][0]).toMatchObject({
    expectedRevision: 3,
    site: { title: "Saved on the site page", tagline: "Typed here" },
  });
});

it("discarding after a conflict is the Admin's choice and drops what is typed", async () => {
  const { result } = renderHook(() => useSystemConfigForm("personalize"));
  await waitFor(() => expect(result.current.baseline.revisions.site).toBe(2));
  act(() =>
    result.current.methods.setValue("site.tagline", "Typed here", {
      shouldDirty: true,
    }),
  );
  state.save.mockRejectedValueOnce({ code: "CONFIG_CONFLICT" });
  await act(async () => {
    await result.current.onSubmit();
  });
  const reloaded = {
    ...state.snapshot!,
    config: {
      ...state.snapshot!.config,
      site: { ...state.snapshot!.config.site, tagline: "Saved elsewhere" },
    },
    revisions: { site: 3, notifications: 3 },
  };
  state.reload.mockResolvedValue({ data: reloaded, isError: false });
  // The refetch also reaches the query the form reads.
  state.snapshot = reloaded;
  await act(async () => {
    await result.current.discardSection();
  });
  expect(result.current.methods.getValues("site.tagline")).toBe(
    "Saved elsewhere",
  );
  expect(result.current.sectionDirty).toBe(false);
  expect(result.current.conflict).toBe(false);
});

it("saves the Theme chosen in the picker with its options and keeps it through a conflict", async () => {
  state.snapshot = {
    ...state.snapshot!,
    config: {
      ...state.snapshot!.config,
      site: {
        ...state.snapshot!.config.site,
        theme: { id: "classic", options: { other: { kept: "yes" } } },
      },
    },
  };
  const form: { current?: ReturnType<typeof useSystemConfigForm> } = {};
  function Settings() {
    const current = useSystemConfigForm("personalize");
    form.current = current;
    return createElement(FormProvider<ConfigFormValues>, {
      ...current.methods,
      children: createElement(ThemePicker, {
        themes: [...THEMES, fixtureTheme],
      }),
    });
  }
  render(createElement(Settings));
  await waitFor(() => expect(form.current!.baseline.revisions.site).toBe(2));
  expect(form.current!.sectionDirty).toBe(false);

  const themes = screen.getByRole("radiogroup", { name: m.settings_theme() });
  fireEvent.click(within(themes).getByRole("radio", { name: "Fixture" }));
  fireEvent.click(
    within(screen.getByRole("radiogroup", { name: "Marker" })).getByRole(
      "radio",
      { name: "Off" },
    ),
  );
  expect(form.current!.sectionDirty).toBe(true);

  state.save.mockRejectedValueOnce({ code: "CONFIG_CONFLICT" });
  await act(async () => {
    await form.current!.onSubmit();
  });
  expect(form.current!.conflict).toBe(true);
  expect(form.current!.sectionDirty).toBe(true);
  expect(form.current!.methods.getValues("site.theme")).toEqual({
    id: "fixture",
    options: { other: { kept: "yes" }, fixture: { marker: "off" } },
  });

  state.save.mockImplementationOnce(async (input) => ({
    ...state.snapshot!,
    config: { ...state.snapshot!.config, site: input.site },
    revisions: { site: 3, notifications: 3 },
  }));
  await act(async () => {
    await form.current!.onSubmit();
  });
  expect(state.save.mock.calls[1][0].site.theme).toEqual({
    id: "fixture",
    options: { other: { kept: "yes" }, fixture: { marker: "off" } },
  });
  expect(form.current!.sectionDirty).toBe(false);
  expect(form.current!.conflict).toBe(false);
});
