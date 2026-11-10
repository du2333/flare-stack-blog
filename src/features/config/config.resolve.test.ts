import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import {
  resolveSiteConfig,
  resolveSystemConfig,
} from "@/features/config/config.resolve";

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

describe("resolveSiteConfig navLinks", () => {
  it("defaults to an empty list", () => {
    expect(resolveSiteConfig({}).navLinks).toEqual([]);
  });

  it("keeps valid links and drops the rest", () => {
    const config = resolveSiteConfig({
      site: {
        navLinks: [
          { label: "About", href: "/post/about" },
          { label: "GitHub", href: "github.com/du2333" },
          { label: "Bad", href: "javascript:alert(1)" },
          { label: "", href: "/posts" },
          { label: "Extra", href: "/too-many-1" },
          { label: "Extra", href: "/too-many-2" },
          { label: "Extra", href: "/too-many-3" },
          { label: "Extra", href: "/too-many-4" },
        ],
      },
    });

    expect(config.navLinks).toEqual([
      { label: "About", href: "/post/about" },
      { label: "GitHub", href: "https://github.com/du2333" },
      { label: "Extra", href: "/too-many-1" },
      { label: "Extra", href: "/too-many-2" },
      { label: "Extra", href: "/too-many-3" },
    ]);
  });
});

type StoredConfig = Parameters<typeof resolveSiteConfig>[0];

describe("resolveSiteConfig personalization shared by all Themes", () => {
  const legacy = {
    homeBg: "/images/asset/themes/fuwari/home-bg.webp?v=1",
    avatar: "/images/asset/themes/fuwari/avatar.png?v=1",
    primaryHue: 120,
  };

  it("defaults to the classic Theme and a centred banner", () => {
    expect(resolveSiteConfig({})).toMatchObject({
      bannerImage: "/images/home-bg.webp",
      bannerFocus: { x: 50, y: 50 },
      avatar: "/images/avatar.png",
      primaryHue: 250,
      brandMark: "default",
      tagline: "",
      theme: { id: "classic", options: {} },
    });
  });

  it("reads a document that only has the old theme location as if it were migrated", () => {
    const old = resolveSiteConfig({ site: { theme: { fuwari: legacy } } });
    const migrated = resolveSiteConfig({
      site: {
        bannerImage: legacy.homeBg,
        avatar: legacy.avatar,
        primaryHue: legacy.primaryHue,
      },
    });
    expect(old).toEqual(migrated);
    expect(old).toMatchObject({
      bannerImage: legacy.homeBg,
      avatar: legacy.avatar,
      primaryHue: 120,
    });
  });

  it("keeps an empty image from the old location instead of the default", () => {
    const site = resolveSiteConfig({
      site: { theme: { fuwari: { homeBg: "", avatar: "" } } },
    });
    expect(site.bannerImage).toBe("");
    expect(site.avatar).toBe("");
  });

  it("prefers the shared fields over the old location", () => {
    const site = resolveSiteConfig({
      site: {
        bannerImage: "https://cdn.example.com/banner.webp",
        avatar: "",
        primaryHue: 0,
        theme: { fuwari: legacy },
      },
    });
    expect(site).toMatchObject({
      bannerImage: "https://cdn.example.com/banner.webp",
      avatar: "",
      primaryHue: 0,
    });
  });

  it("copies the shared fields to the old location for older builds", () => {
    const site = resolveSiteConfig({
      site: { bannerImage: "/b.webp", avatar: "/a.png", primaryHue: 10 },
    });
    expect(site.theme.fuwari).toEqual({
      homeBg: "/b.webp",
      avatar: "/a.png",
      primaryHue: 10,
    });
  });

  it("reads a Theme id this build does not offer as the default Theme", () => {
    const stored = {
      site: { theme: { id: "card", options: { card: { frame: "4:3" } } } },
    } as unknown as StoredConfig;
    const site = resolveSiteConfig(stored);
    expect(site.theme.id).toBe("classic");
    expect(site.theme.options).toEqual({ card: { frame: "4:3" } });
  });

  it("keeps unknown option keys and drops entries it cannot read", () => {
    const stored = {
      site: {
        theme: {
          id: "classic",
          options: {
            classic: { unknown: "x", count: 2, off: false, nested: { a: 1 } },
            bad: 3,
          },
        },
      },
    } as unknown as StoredConfig;
    expect(resolveSiteConfig(stored).theme.options).toEqual({
      classic: { unknown: "x", count: 2, off: false },
    });
  });

  it("falls back per field instead of failing on an invalid stored value", () => {
    const stored = {
      site: {
        bannerFocus: { x: 150, y: 20 },
        brandMark: "logo",
        tagline: 42,
        primaryHue: 999,
        theme: { id: 7, options: "none", fuwari: { primaryHue: 30 } },
      },
    } as unknown as StoredConfig;
    expect(resolveSiteConfig(stored)).toMatchObject({
      bannerFocus: { x: 50, y: 50 },
      brandMark: "default",
      tagline: "",
      primaryHue: 30,
      theme: { id: "classic", options: {} },
    });
  });
});
