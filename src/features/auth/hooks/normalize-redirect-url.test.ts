import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeRedirectUrl } from "./normalize-redirect-url";

describe("normalizeRedirectUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://blog.example.com",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a safe fallback when redirectTo is missing", () => {
    expect(normalizeRedirectUrl(undefined, "/")).toBe(
      "https://blog.example.com/",
    );
  });

  it("allows same-origin absolute urls", () => {
    expect(
      normalizeRedirectUrl(
        "https://blog.example.com/admin?tab=mcp",
        "/dashboard",
      ),
    ).toBe("https://blog.example.com/admin?tab=mcp");
  });

  it("keeps same-origin api redirects relative", () => {
    expect(
      normalizeRedirectUrl(
        "https://blog.example.com/api/auth/oauth2/authorize?client_id=abc",
        "/dashboard",
      ),
    ).toBe("/api/auth/oauth2/authorize?client_id=abc");
  });

  it("rejects external absolute urls", () => {
    expect(
      normalizeRedirectUrl("https://evil.example.com/phish", "/dashboard"),
    ).toBe("https://blog.example.com/dashboard");
  });
});
