import { describe, expect, it } from "vitest";
import { splitMomentText } from "./moment-text";

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
