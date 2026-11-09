import { describe, expect, it } from "vitest";
import { momentTextParts, momentTextTitle } from "./moment-text";

describe("momentTextParts", () => {
  it("splits web addresses from the text around them", () => {
    expect(momentTextParts("看 https://example.com/a?b=1 这个")).toEqual([
      { type: "text", value: "看 " },
      { type: "link", value: "https://example.com/a?b=1" },
      { type: "text", value: " 这个" },
    ]);
  });

  it("ends an address where Chinese text follows it", () => {
    expect(momentTextParts("http://a.com/x这是")).toEqual([
      { type: "link", value: "http://a.com/x" },
      { type: "text", value: "这是" },
    ]);
  });

  it("leaves the punctuation of the sentence out of the address", () => {
    expect(momentTextParts("(see https://a.com/x).")).toEqual([
      { type: "text", value: "(see " },
      { type: "link", value: "https://a.com/x" },
      { type: "text", value: ")." },
    ]);
    expect(momentTextParts("https://a.com/wiki/Foo_(bar)!")).toEqual([
      { type: "link", value: "https://a.com/wiki/Foo_(bar)" },
      { type: "text", value: "!" },
    ]);
  });

  it("does not link a scheme alone or other schemes", () => {
    expect(momentTextParts("http:// and javascript:alert(1)")).toEqual([
      { type: "text", value: "http:// and javascript:alert(1)" },
    ]);
  });

  it("gives the text back when the parts are joined", () => {
    const text = "a https://x.y/z, b\nhttp://q.r. end";
    expect(
      momentTextParts(text)
        .map((part) => part.value)
        .join(""),
    ).toBe(text);
  });
});

describe("momentTextTitle", () => {
  it("is the text on one line", () => {
    expect(momentTextTitle("  first\n\nsecond\tthird ")).toBe(
      "first second third",
    );
  });

  it("keeps 40 code points whole", () => {
    expect(momentTextTitle("字".repeat(40))).toBe("字".repeat(40));
    expect(momentTextTitle("😀".repeat(40))).toBe("😀".repeat(40));
  });

  it("cuts after 40 code points with an ellipsis, never inside an emoji", () => {
    expect(momentTextTitle("字".repeat(41))).toBe(`${"字".repeat(40)}…`);
    expect(momentTextTitle("😀".repeat(45))).toBe(`${"😀".repeat(40)}…`);
  });

  it("drops the space before the ellipsis", () => {
    expect(momentTextTitle(`${"a".repeat(39)} bbb`)).toBe(`${"a".repeat(39)}…`);
  });

  it("is null for blank text", () => {
    expect(momentTextTitle("")).toBeNull();
    expect(momentTextTitle(" \n\t ")).toBeNull();
  });
});
