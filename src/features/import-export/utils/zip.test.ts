import { describe, expect, it } from "vitest";
import { strToU8 } from "fflate";
import {
  buildZip,
  listDirectories,
  listFiles,
  parseZip,
  readJsonFile,
  readTextFile,
} from "@/features/import-export/utils/zip";

describe("buildZip + parseZip round-trip", () => {
  it("should round-trip a single text file", () => {
    const zip = buildZip({ "hello.txt": "world" });
    const files = parseZip(zip);

    expect(readTextFile(files, "hello.txt")).toBe("world");
  });

  it("should round-trip multiple files", () => {
    const zip = buildZip({ "a.txt": "A", "b.txt": "B" });
    const files = parseZip(zip);

    expect(readTextFile(files, "a.txt")).toBe("A");
    expect(readTextFile(files, "b.txt")).toBe("B");
  });

  it("should round-trip binary data", () => {
    const binary = new Uint8Array([0, 1, 2, 128, 255]);
    const zip = buildZip({ "data.bin": binary });
    const files = parseZip(zip);

    expect(files["data.bin"]).toEqual(binary);
  });

  it("should handle nested directory paths", () => {
    const zip = buildZip({ "posts/my-post/index.md": "content" });
    const files = parseZip(zip);

    expect(readTextFile(files, "posts/my-post/index.md")).toBe("content");
  });

  it("should handle empty file content", () => {
    const zip = buildZip({ "empty.txt": "" });
    const files = parseZip(zip);

    expect(readTextFile(files, "empty.txt")).toBe("");
  });

  it("should handle Chinese content", () => {
    const zip = buildZip({ "中文.md": "你好世界" });
    const files = parseZip(zip);

    expect(readTextFile(files, "中文.md")).toBe("你好世界");
  });
});

describe("readTextFile", () => {
  const files: Record<string, Uint8Array> = {
    "test.txt": strToU8("hello"),
    "utf8.txt": strToU8("你好"),
  };

  it("should read text from known path", () => {
    expect(readTextFile(files, "test.txt")).toBe("hello");
  });

  it("should return null for missing path", () => {
    expect(readTextFile(files, "missing.txt")).toBeNull();
  });

  it("should handle UTF-8 content", () => {
    expect(readTextFile(files, "utf8.txt")).toBe("你好");
  });
});

describe("readJsonFile", () => {
  it("should parse valid JSON", () => {
    const files: Record<string, Uint8Array> = {
      "data.json": strToU8('{"key":"value"}'),
    };
    expect(readJsonFile(files, "data.json")).toEqual({ key: "value" });
  });

  it("should return null for invalid JSON", () => {
    const files: Record<string, Uint8Array> = {
      "bad.json": strToU8("not json{"),
    };
    expect(readJsonFile(files, "bad.json")).toBeNull();
  });

  it("should return null for missing path", () => {
    expect(readJsonFile({}, "missing.json")).toBeNull();
  });

  it("should parse array JSON", () => {
    const files: Record<string, Uint8Array> = {
      "arr.json": strToU8("[1,2,3]"),
    };
    expect(readJsonFile(files, "arr.json")).toEqual([1, 2, 3]);
  });
});

describe("listFiles", () => {
  const files: Record<string, Uint8Array> = {
    "posts/a/1.md": new Uint8Array(),
    "posts/a/2.md": new Uint8Array(),
    "other/3.md": new Uint8Array(),
  };

  it("should list files matching prefix", () => {
    const result = listFiles(files, "posts/a/");
    expect(result).toHaveLength(2);
    expect(result).toContain("posts/a/1.md");
    expect(result).toContain("posts/a/2.md");
  });

  it("should return empty array when no match", () => {
    expect(listFiles(files, "nonexistent/")).toEqual([]);
  });
});

describe("listDirectories", () => {
  const files: Record<string, Uint8Array> = {
    "posts/alpha/index.md": new Uint8Array(),
    "posts/alpha/content.json": new Uint8Array(),
    "posts/beta/index.md": new Uint8Array(),
  };

  it("should list deduplicated top-level directories", () => {
    const result = listDirectories(files, "posts/");
    expect(result.sort()).toEqual(["alpha", "beta"]);
  });

  it("should return empty for no matching prefix", () => {
    expect(listDirectories(files, "nope/")).toEqual([]);
  });
});
