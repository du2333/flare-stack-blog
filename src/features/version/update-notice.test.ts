import { describe, expect, it } from "vitest";
import { ms } from "@/lib/duration";
import {
  ignoreUpdateNotice,
  recordUpdateNoticeShown,
  shouldShowUpdateNotice,
  UPDATE_NOTICE_STORAGE_KEY,
} from "./update-notice";

type NoticeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function createMemoryStorage(): NoticeStorage & {
  values: Map<string, string>;
} {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("update notice", () => {
  it("shows a new application release immediately", () => {
    const storage = createMemoryStorage();
    recordUpdateNoticeShown(storage, "v1.5.3", 1_000);

    expect(shouldShowUpdateNotice(storage, "v1.6.0", 2_000)).toBe(true);
  });

  it("shows the same release at most once per day", () => {
    const storage = createMemoryStorage();
    recordUpdateNoticeShown(storage, "v1.6.0", 1_000);

    expect(shouldShowUpdateNotice(storage, "v1.6.0", 2_000)).toBe(false);
    expect(
      shouldShowUpdateNotice(storage, "v1.6.0", 1_000 + ms("1d") + 1),
    ).toBe(true);
  });

  it("ignores only the selected release", () => {
    const storage = createMemoryStorage();
    recordUpdateNoticeShown(storage, "v1.6.0", 1_000);
    ignoreUpdateNotice(storage, "v1.6.0");

    expect(shouldShowUpdateNotice(storage, "v1.6.0", 1_000 + ms("2d"))).toBe(
      false,
    );
    expect(shouldShowUpdateNotice(storage, "v1.7.0", 2_000)).toBe(true);
  });

  it("preserves ignore state when a manual check shows the same release", () => {
    const storage = createMemoryStorage();
    recordUpdateNoticeShown(storage, "v1.6.0", 1_000);
    ignoreUpdateNotice(storage, "v1.6.0");

    recordUpdateNoticeShown(storage, "v1.6.0", 2_000);

    expect(shouldShowUpdateNotice(storage, "v1.6.0", 2_000 + ms("2d"))).toBe(
      false,
    );
  });

  it("removes damaged state and allows the notice", () => {
    const storage = createMemoryStorage();
    storage.values.set(UPDATE_NOTICE_STORAGE_KEY, "not json");

    expect(shouldShowUpdateNotice(storage, "v1.6.0", 1_000)).toBe(true);
    expect(storage.values.has(UPDATE_NOTICE_STORAGE_KEY)).toBe(false);
  });
});
