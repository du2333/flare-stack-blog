import { describe, expect, it } from "vitest";
import { showsRelativeMomentTime } from "./moment-time";

const now = Date.UTC(2026, 10, 8, 12);
const hoursAgo = (n: number) => new Date(now - n * 60 * 60 * 1000);

describe("showsRelativeMomentTime", () => {
  it("is relative within 7 days", () => {
    expect(showsRelativeMomentTime(hoursAgo(3), now)).toBe(true);
    expect(showsRelativeMomentTime(hoursAgo(24 * 7 - 1), now)).toBe(true);
  });

  it("shows the date from 7 days on", () => {
    expect(showsRelativeMomentTime(hoursAgo(24 * 7), now)).toBe(false);
    expect(showsRelativeMomentTime(hoursAgo(24 * 30), now)).toBe(false);
  });

  it("treats a time ahead of the clock as just posted", () => {
    expect(showsRelativeMomentTime(new Date(now + 5000), now)).toBe(true);
  });
});
