import { describe, expect, it } from "vitest";
import { getWebhookExampleLabel } from "./webhook.helpers";

describe("getWebhookExampleLabel", () => {
  it("can resolve labels for an explicit locale", () => {
    const zhLabel = getWebhookExampleLabel("post_title", { locale: "zh" });
    expect(zhLabel).toBe("欢迎使用通知系统");

    const enLabel = getWebhookExampleLabel("post_title", { locale: "en" });
    expect(enLabel).not.toBe(zhLabel);
    expect(enLabel).toContain("Welcome");
  });
});
