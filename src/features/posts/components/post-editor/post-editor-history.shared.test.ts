import { describe, expect, it } from "vitest";
import { toDateOrNull } from "./post-editor-history.shared";

describe("toDateOrNull", () => {
  it("returns null for empty values", () => {
    expect(toDateOrNull(null)).toBeNull();
    expect(toDateOrNull(undefined)).toBeNull();
    expect(toDateOrNull("")).toBeNull();
  });

  it("keeps a valid Date", () => {
    const date = new Date("2026-08-22T12:00:00.000Z");
    expect(toDateOrNull(date)?.toISOString()).toBe(date.toISOString());
  });

  it("parses an ISO string", () => {
    expect(toDateOrNull("2026-08-22T12:00:00.000Z")?.toISOString()).toBe(
      "2026-08-22T12:00:00.000Z",
    );
  });

  it("returns null for invalid input", () => {
    expect(toDateOrNull("not-a-date")).toBeNull();
    expect(toDateOrNull({})).toBeNull();
  });
});
