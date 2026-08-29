import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import { resolveSystemConfig } from "@/features/config/config.resolve";

describe("resolveSystemConfig webhook", () => {
  it("keeps a single webhook URL and secret", () => {
    const config = resolveSystemConfig({
      ...DEFAULT_CONFIG,
      notification: {
        webhook: {
          url: "https://example.com/hook",
          secret: "s3cret",
        },
      },
    });

    expect(config.notification?.webhook).toEqual({
      url: "https://example.com/hook",
      secret: "s3cret",
    });
    expect(config.notification).not.toHaveProperty("webhooks");
    expect(config.notification?.admin?.channels).toEqual({ email: true });
  });

  it("prefers a configured webhook URL over leftover legacy endpoints", () => {
    const config = resolveSystemConfig({
      notification: {
        webhook: {
          url: "https://example.com/new",
          secret: "new-secret",
        },
        webhooks: [
          {
            url: "https://example.com/old",
            secret: "old-secret",
          },
        ],
      },
    });

    expect(config.notification?.webhook).toEqual({
      url: "https://example.com/new",
      secret: "new-secret",
    });
  });

  it("takes url and secret from the first legacy endpoint", () => {
    const config = resolveSystemConfig({
      notification: {
        admin: {
          channels: {
            email: false,
            webhook: false,
          },
        },
        webhooks: [
          {
            id: "first",
            name: "First",
            url: "https://example.com/first",
            enabled: false,
            secret: "first-secret",
            events: ["friend_link.submitted"],
          },
          {
            id: "second",
            url: "https://example.com/second",
            secret: "second-secret",
          },
        ],
      },
    });

    expect(config.notification?.webhook).toEqual({
      url: "https://example.com/first",
      secret: "first-secret",
    });
    expect(config.notification).not.toHaveProperty("webhooks");
    expect(config.notification?.admin?.channels).toEqual({ email: false });
  });
});
