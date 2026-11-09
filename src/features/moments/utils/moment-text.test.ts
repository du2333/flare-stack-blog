import { describe, expect, it } from "vitest";
import { momentTextTitle, splitMomentText } from "./moment-text";

describe("splitMomentText", () => {
  it("keeps text without an address as one part, line breaks included", () => {
    expect(splitMomentText("第一行\n第二行")).toEqual([
      { type: "text", value: "第一行\n第二行" },
    ]);
  });

  it("links web addresses and keeps the text around them", () => {
    expect(splitMomentText("看 https://example.com/a?b=1 这里")).toEqual([
      { type: "text", value: "看 " },
      { type: "link", value: "https://example.com/a?b=1" },
      { type: "text", value: " 这里" },
    ]);
  });

  it("leaves sentence punctuation and CJK text out of the link", () => {
    expect(splitMomentText("见https://example.com/x。再见")).toEqual([
      { type: "text", value: "见" },
      { type: "link", value: "https://example.com/x" },
      { type: "text", value: "。再见" },
    ]);
    expect(splitMomentText("see https://example.com/x, ok.")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "https://example.com/x" },
      { type: "text", value: ", ok." },
    ]);
  });

  it("keeps a bracket that opens inside the address", () => {
    expect(splitMomentText("(https://example.com/a)")).toEqual([
      { type: "text", value: "(" },
      { type: "link", value: "https://example.com/a" },
      { type: "text", value: ")" },
    ]);
    expect(splitMomentText("https://en.wikipedia.org/wiki/Foo_(bar)")).toEqual([
      { type: "link", value: "https://en.wikipedia.org/wiki/Foo_(bar)" },
    ]);
  });

  it("links several addresses", () => {
    expect(splitMomentText("http://a.com https://b.com")).toEqual([
      { type: "link", value: "http://a.com" },
      { type: "text", value: " " },
      { type: "link", value: "https://b.com" },
    ]);
  });

  it("does not link other schemes", () => {
    expect(splitMomentText("javascript:alert(1) ftp://a.com")).toEqual([
      { type: "text", value: "javascript:alert(1) ftp://a.com" },
    ]);
  });
});

describe("splitMomentText, as feeds use it", () => {
  it("splits web addresses from the text around them", () => {
    expect(splitMomentText("看 https://example.com/a?b=1 这个")).toEqual([
      { type: "text", value: "看 " },
      { type: "link", value: "https://example.com/a?b=1" },
      { type: "text", value: " 这个" },
    ]);
  });

  it("ends an address where Chinese text follows it", () => {
    expect(splitMomentText("http://a.com/x这是")).toEqual([
      { type: "link", value: "http://a.com/x" },
      { type: "text", value: "这是" },
    ]);
  });

  it("leaves the punctuation of the sentence out of the address", () => {
    expect(splitMomentText("(see https://a.com/x).")).toEqual([
      { type: "text", value: "(see " },
      { type: "link", value: "https://a.com/x" },
      { type: "text", value: ")." },
    ]);
    expect(splitMomentText("https://a.com/wiki/Foo_(bar)!")).toEqual([
      { type: "link", value: "https://a.com/wiki/Foo_(bar)" },
      { type: "text", value: "!" },
    ]);
  });

  it("does not link a scheme alone or other schemes", () => {
    expect(splitMomentText("http:// and javascript:alert(1)")).toEqual([
      { type: "text", value: "http:// and javascript:alert(1)" },
    ]);
  });

  it("gives the text back when the parts are joined", () => {
    const text = "a https://x.y/z, b\nhttp://q.r. end";
    expect(
      splitMomentText(text)
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
