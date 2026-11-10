import { describe, expect, it } from "vitest";
import {
  initialSidebarState,
  isSidebarCollapsed,
  leaveEditor,
  parseSidebarPreference,
  serializeSidebarPreference,
  toggleSidebar,
} from "./sidebar-state";

describe("isSidebarCollapsed", () => {
  it("follows the saved preference outside the editor", () => {
    expect(isSidebarCollapsed(initialSidebarState(false), false)).toBe(false);
    expect(isSidebarCollapsed(initialSidebarState(true), false)).toBe(true);
  });

  it("starts collapsed in the editor whatever the preference", () => {
    expect(isSidebarCollapsed(initialSidebarState(false), true)).toBe(true);
    expect(isSidebarCollapsed(initialSidebarState(true), true)).toBe(true);
  });
});

describe("toggleSidebar", () => {
  it("rewrites the preference outside the editor", () => {
    const state = toggleSidebar(initialSidebarState(false), false);
    expect(state.preference).toBe(true);
    expect(isSidebarCollapsed(state, false)).toBe(true);
    expect(toggleSidebar(state, false).preference).toBe(false);
  });

  it("only overrides the current stay inside the editor", () => {
    const state = toggleSidebar(initialSidebarState(false), true);
    expect(state.preference).toBe(false);
    expect(isSidebarCollapsed(state, true)).toBe(false);
    expect(isSidebarCollapsed(state, false)).toBe(false);
    expect(isSidebarCollapsed(toggleSidebar(state, true), true)).toBe(true);
  });

  it("keeps a collapsed preference when the editor is expanded by hand", () => {
    const state = toggleSidebar(initialSidebarState(true), true);
    expect(isSidebarCollapsed(state, true)).toBe(false);
    expect(isSidebarCollapsed(state, false)).toBe(true);
  });
});

describe("leaveEditor", () => {
  it("drops the editor override so the next stay starts collapsed again", () => {
    const expanded = toggleSidebar(initialSidebarState(false), true);
    const left = leaveEditor(expanded);
    expect(left.editorOverride).toBeNull();
    expect(isSidebarCollapsed(left, true)).toBe(true);
  });

  it("returns the same state when there is no override", () => {
    const state = initialSidebarState(true);
    expect(leaveEditor(state)).toBe(state);
  });
});

describe("sidebar preference cookie", () => {
  it("defaults to expanded without a cookie", () => {
    expect(parseSidebarPreference(undefined)).toBe(false);
    expect(parseSidebarPreference("")).toBe(false);
    expect(parseSidebarPreference("ui-theme=dark")).toBe(false);
  });

  it("reads its value among other cookies", () => {
    expect(parseSidebarPreference("a=1; admin-sidebar=collapsed; b=2")).toBe(
      true,
    );
    expect(parseSidebarPreference("admin-sidebar=expanded")).toBe(false);
    expect(parseSidebarPreference("admin-sidebar=garbage")).toBe(false);
  });

  it("round-trips through the serialized cookie", () => {
    for (const collapsed of [true, false]) {
      const cookie = serializeSidebarPreference(collapsed).split(";")[0];
      expect(parseSidebarPreference(cookie)).toBe(collapsed);
    }
  });
});
