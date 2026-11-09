import { describe, expect, it } from "vitest";
import { momentDescription, momentTitle } from "./moment-share";

describe("momentTitle", () => {
  it("takes the first 40 characters of the text", () => {
    expect(momentTitle({ text: "短" }, "图片动态")).toBe("短");
    expect(momentTitle({ text: "字".repeat(60) }, "图片动态")).toBe(
      "字".repeat(40),
    );
  });

  it("counts an emoji once and joins lines", () => {
    expect(momentTitle({ text: "😀".repeat(50) }, "x")).toBe("😀".repeat(40));
    expect(momentTitle({ text: "一\n\n二" }, "x")).toBe("一 二");
  });

  it("falls back when there is no text", () => {
    expect(momentTitle({ text: "" }, "视频动态")).toBe("视频动态");
    expect(momentTitle({ text: " \n " }, "视频动态")).toBe("视频动态");
  });
});

describe("momentDescription", () => {
  it("is the text up to 160 characters", () => {
    expect(momentDescription({ text: "字".repeat(200) })).toBe(
      "字".repeat(160),
    );
    expect(momentDescription({ text: "" })).toBe("");
  });
});
