import { describe, expect, it } from "vitest";
import { isMomentTextFormat, momentTextLength } from "./moment-rules";

describe("momentTextLength", () => {
  it("counts code points, not UTF-16 units", () => {
    expect(momentTextLength("abc")).toBe(3);
    expect(momentTextLength("动态")).toBe(2);
    expect(momentTextLength("😀")).toBe(1);
    expect("😀".length).toBe(2);
  });
});

describe("isMomentTextFormat", () => {
  it("keeps line breaks and tabs", () => {
    expect(isMomentTextFormat("one\ntwo\r\n\tthree")).toBe(true);
  });

  it("refuses other control and format characters", () => {
    expect(isMomentTextFormat("a\u0000b")).toBe(false);
    expect(isMomentTextFormat("a​b")).toBe(false);
    expect(isMomentTextFormat("a‮b")).toBe(false);
  });

  it("allows a zero width joiner inside an emoji", () => {
    expect(isMomentTextFormat("👩‍💻")).toBe(true);
  });
});
