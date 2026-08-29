import { describe, expect, it } from "vitest";
import { commentSnippet, popularityAlertFromStatus } from "./dashboard";

describe("popularityAlertFromStatus", () => {
  it("hides when Umami is not configured", () => {
    expect(
      popularityAlertFromStatus({
        configured: false,
        expired: true,
        lastError: "missing key",
      }),
    ).toBeNull();
  });

  it("hides when the snapshot is healthy", () => {
    expect(
      popularityAlertFromStatus({
        configured: true,
        expired: false,
        lastError: null,
      }),
    ).toBeNull();
  });

  it("prefers a failed sync over expiry", () => {
    expect(
      popularityAlertFromStatus({
        configured: true,
        expired: true,
        lastError: "umami 502",
      }),
    ).toBe("failed");
  });

  it("surfaces an expired snapshot", () => {
    expect(
      popularityAlertFromStatus({
        configured: true,
        expired: true,
        lastError: null,
      }),
    ).toBe("expired");
  });
});

describe("commentSnippet", () => {
  it("collapses whitespace from plain text", () => {
    expect(commentSnippet("hello\n\n  world")).toBe("hello world");
  });

  it("truncates long text", () => {
    const snippet = commentSnippet("a".repeat(90), 80);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet.length).toBe(81);
  });

  it("flattens leftover json comments", () => {
    expect(
      commentSnippet({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "感谢" }],
          },
        ],
      }),
    ).toBe("感谢");
  });
});
