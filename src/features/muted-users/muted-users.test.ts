import { describe, expect, it } from "vitest";
import { isMuted } from "./muted-users";

describe("isMuted", () => {
  it("is false when mutedAt is missing", () => {
    expect(isMuted(null)).toBe(false);
    expect(isMuted(undefined)).toBe(false);
  });

  it("is true when mutedAt is set", () => {
    expect(isMuted(new Date("2026-01-01T00:00:00.000Z"))).toBe(true);
  });
});
