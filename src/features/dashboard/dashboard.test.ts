import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import {
  adminEmailNeedsSetup,
  commentSnippet,
  popularityAlertFromStatus,
  siteIdentityIsDefault,
} from "./dashboard";

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

describe("adminEmailNeedsSetup", () => {
  it("surfaces the default config", () => {
    expect(adminEmailNeedsSetup(DEFAULT_CONFIG)).toBe(true);
  });

  it("hides when admin email notifications are off", () => {
    expect(
      adminEmailNeedsSetup({
        ...DEFAULT_CONFIG,
        notification: {
          ...DEFAULT_CONFIG.notification,
          admin: { channels: { email: false } },
        },
      }),
    ).toBe(false);
  });

  it("hides when SMTP is complete", () => {
    expect(
      adminEmailNeedsSetup({
        ...DEFAULT_CONFIG,
        email: {
          host: "smtp.example.com",
          port: 465,
          username: "blog",
          password: "secret",
          senderAddress: "blog@example.com",
        },
      }),
    ).toBe(false);
  });
});

describe("siteIdentityIsDefault", () => {
  it("surfaces the shipped title or author", () => {
    expect(siteIdentityIsDefault(DEFAULT_CONFIG.site)).toBe(true);
    expect(
      siteIdentityIsDefault({ ...DEFAULT_CONFIG.site, title: "冷静的阿矿" }),
    ).toBe(true);
  });

  it("hides after both title and author change", () => {
    expect(
      siteIdentityIsDefault({
        ...DEFAULT_CONFIG.site,
        title: "冷静的阿矿",
        author: "阿矿",
      }),
    ).toBe(false);
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
