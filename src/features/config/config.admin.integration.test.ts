import { createTestContext } from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { invalidate } from "@/features/cache/public-cache";
import { SystemConfigTable } from "@/lib/db/schema";
import {
  getAdminConfig,
  updateSystemConfig,
  resolveTestSecret,
  getSiteConfig,
} from "./service/config.service";
import { getSystemConfig } from "./data/config.data";
import type { StoredSystemConfig } from "./config.storage";
import {
  UpdateConfigSectionSchema,
  type UpdateConfigSection,
} from "./config.admin.schema";

function delivery(revision = 0): UpdateConfigSection {
  return {
    section: "notifications",
    expectedRevision: revision,
    email: {
      host: "smtp.example.com",
      port: 465,
      username: "writer",
      senderName: "Blog",
      senderAddress: "blog@example.com",
    },
    notification: {
      admin: { channels: { email: true } },
      user: { emailEnabled: true },
      webhook: { url: "https://example.com/hook" },
    },
    secrets: {
      emailPassword: { action: "replace", value: "fictional-password" },
      webhookSecret: { action: "replace", value: "fictional-signing-key" },
    },
  };
}

describe("versioned System Config", () => {
  it("preserves unrelated sections and rejects a stale write to the same section", async () => {
    const context = createTestContext();
    await updateSystemConfig(context, delivery());
    const site = await updateSystemConfig(context, {
      section: "site",
      expectedRevision: 0,
      site: { title: "New title" },
    });
    expect(site.revisions).toEqual({ site: 1, notifications: 1 });
    expect((await getSystemConfig(context.db))?.email?.password).toBe(
      "fictional-password",
    );
    await expect(
      updateSystemConfig(context, {
        section: "site",
        expectedRevision: 0,
        site: { title: "Stale" },
      }),
    ).rejects.toMatchObject({ code: "CONFIG_CONFLICT" });
    expect((await getAdminConfig(context)).config.site?.title).toBe(
      "New title",
    );
  });
  it("has exactly one winner for concurrent initial writes to one section", async () => {
    const context = createTestContext();
    const results = await Promise.allSettled(
      ["A", "B"].map((title) =>
        updateSystemConfig(context, {
          section: "site",
          expectedRevision: 0,
          site: { title },
        }),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(await context.db.select().from(SystemConfigTable)).toHaveLength(1);
  });
  it("allows concurrent writes to different sections without lost updates", async () => {
    const context = createTestContext();
    await Promise.all([
      updateSystemConfig(context, delivery()),
      updateSystemConfig(context, {
        section: "site",
        expectedRevision: 0,
        site: { title: "Parallel" },
      }),
    ]);
    const result = await getAdminConfig(context);
    expect(result.revisions).toEqual({ site: 1, notifications: 1 });
    expect(result.config.site?.title).toBe("Parallel");
    expect(result.config.email?.host).toBe("smtp.example.com");
  });
  it("redacts secrets and supports keep, replace, explicit clear, and versioned test reuse", async () => {
    const context = createTestContext();
    const result = await updateSystemConfig(context, delivery());
    expect(JSON.stringify(result)).not.toContain("fictional-password");
    expect(JSON.stringify(result)).not.toContain("fictional-signing-key");
    expect(result.secrets).toEqual({
      emailPasswordConfigured: true,
      webhookSecretConfigured: true,
    });
    const keep = delivery(1);
    if (keep.section !== "notifications") throw new Error("Wrong fixture");
    keep.secrets = {
      emailPassword: { action: "keep" },
      webhookSecret: { action: "keep" },
    };
    await updateSystemConfig(context, keep);
    expect(
      await resolveTestSecret(context, "emailPassword", {
        action: "keep",
        expectedRevision: 2,
      }),
    ).toBe("fictional-password");
    await expect(
      resolveTestSecret(context, "webhookSecret", {
        action: "keep",
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ code: "CONFIG_CONFLICT" });
    const clear = {
      ...keep,
      expectedRevision: 2,
      notification: { ...keep.notification, webhook: { url: "" } },
      secrets: {
        emailPassword: { action: "clear" as const },
        webhookSecret: { action: "clear" as const },
      },
    };
    const cleared = await updateSystemConfig(context, clear);
    expect(cleared.secrets).toEqual({
      emailPasswordConfigured: false,
      webhookSecretConfigured: false,
    });
    expect((await getSystemConfig(context.db))?.email?.password).toBe("");
    expect(JSON.stringify(await getSiteConfig(context))).not.toContain(
      "password",
    );
  });
  it("normalizes legacy stored values before exposing or updating them", async () => {
    const context = createTestContext();
    await context.db.insert(SystemConfigTable).values({
      id: 1,
      configJson: {
        email: {
          apiKey: "legacy-fictional",
          senderAddress: "old@example.com",
        },
        notification: {
          webhooks: [
            { url: "https://example.com/legacy", secret: "legacy-hook" },
          ],
        },
      },
    });
    const initial = await getAdminConfig(context);
    expect(initial.config.email?.host).toBe("smtp.resend.com");
    expect(JSON.stringify(initial)).not.toContain("legacy-fictional");
    await updateSystemConfig(context, {
      section: "site",
      expectedRevision: 0,
      site: { title: "Migrated" },
    });
    const row = (await context.db.select().from(SystemConfigTable))[0];
    expect(row.configJson.schemaVersion).toBe(1);
    expect(row.configJson.email).not.toHaveProperty("apiKey");
    expect(row.configJson.notification?.webhook?.secret).toBe("legacy-hook");
  });
  it("rejects future formats without overwriting them", async () => {
    const context = createTestContext();
    await context.db
      .insert(SystemConfigTable)
      .values({ id: 1, configJson: { schemaVersion: 99 } });
    await expect(
      updateSystemConfig(context, {
        section: "site",
        expectedRevision: 0,
        site: { title: "No" },
      }),
    ).rejects.toMatchObject({ code: "CONFIG_VERSION_UNSUPPORTED" });
    expect(
      (await context.db.select().from(SystemConfigTable))[0].configJson
        .schemaVersion,
    ).toBe(99);
  });
  it("validates version and secret contracts at the admin boundary", async () => {
    expect(
      UpdateConfigSectionSchema.safeParse({ site: { title: "Unversioned" } })
        .success,
    ).toBe(false);
    const input = delivery();
    if (input.section !== "notifications") throw new Error("Wrong fixture");
    expect(
      UpdateConfigSectionSchema.safeParse({
        ...input,
        email: { ...input.email, password: "not-allowed" },
      }).success,
    ).toBe(false);
    expect(
      UpdateConfigSectionSchema.safeParse({
        ...input,
        email: { ...input.email, port: 65536 },
      }).success,
    ).toBe(false);
    const context = createTestContext();
    await expect(
      updateSystemConfig(context, {
        ...input,
        secrets: {
          emailPassword: { action: "replace", value: "test" },
          webhookSecret: { action: "keep" },
        },
      }),
    ).rejects.toMatchObject({ code: "CONFIG_INVALID" });
    expect((await getAdminConfig(context)).revisions.notifications).toBe(0);
  });
  it("keeps a secret only on the channel it was saved for", async () => {
    const context = createTestContext();
    await updateSystemConfig(context, delivery());
    const base = delivery(1);
    if (base.section !== "notifications") throw new Error("Wrong fixture");
    const keep = {
      emailPassword: { action: "keep" as const },
      webhookSecret: { action: "keep" as const },
    };
    // The generic signing key is no Telegram bot token.
    await expect(
      updateSystemConfig(context, {
        ...base,
        notification: {
          ...base.notification,
          webhook: { provider: "telegram", url: "", chatId: "42" },
        },
        secrets: keep,
      }),
    ).rejects.toMatchObject({
      code: "CONFIG_INVALID",
      data: { field: "notification.webhook.secret" },
    });
    await expect(
      resolveTestSecret(
        context,
        "webhookSecret",
        { action: "keep", expectedRevision: 1 },
        "telegram",
      ),
    ).rejects.toMatchObject({ code: "CONFIG_INVALID" });

    const telegram = await updateSystemConfig(context, {
      ...base,
      notification: {
        ...base.notification,
        webhook: { provider: "telegram", url: "", chatId: "42" },
      },
      secrets: { ...keep, webhookSecret: { action: "replace", value: "1:t" } },
    });
    expect(telegram.config.notification?.webhook).toEqual({
      provider: "telegram",
      url: "",
      secret: "",
      chatId: "42",
    });
    expect(telegram.secrets.webhookSecretConfigured).toBe(true);

    // Discord needs no secret, so the bot token is dropped.
    await updateSystemConfig(context, {
      ...base,
      expectedRevision: 2,
      notification: {
        ...base.notification,
        webhook: {
          provider: "discord",
          url: "https://discord.com/api/webhooks/1/x",
        },
      },
      secrets: keep,
    });
    expect(
      (await getSystemConfig(context.db))?.notification?.webhook,
    ).toMatchObject({ provider: "discord", secret: "", chatId: "42" });
  });
  it("enforces singleton identity in the database", async () => {
    const context = createTestContext();
    await expect(
      context.db.insert(SystemConfigTable).values({ id: 2, configJson: {} }),
    ).rejects.toThrow();
  });
});

// The shape of `site.theme.fuwari` that builds before the shared fields read.
const OlderBuildFuwariSchema = z
  .object({
    homeBg: z.string(),
    avatar: z.string(),
    primaryHue: z.number().int().min(0).max(360),
  })
  .strict();

describe("personalization shared by all Themes", () => {
  const legacy = {
    homeBg: "/images/asset/themes/fuwari/home-bg.webp?v=1",
    avatar: "/images/asset/themes/fuwari/avatar.png?v=1",
    primaryHue: 120,
  };

  it("reads the old location and an unknown Theme on both read paths, then saves the new location", async () => {
    const context = createTestContext();
    await invalidate.siteConfigChanged(context);
    await context.db.insert(SystemConfigTable).values({
      id: 1,
      // A Theme id that this build does not offer, as a newer build may write.
      configJson: {
        schemaVersion: 1,
        site: {
          title: "Legacy",
          theme: { id: "retired", fuwari: legacy },
        },
      } as unknown as StoredSystemConfig,
    });

    const expected = {
      bannerImage: legacy.homeBg,
      avatar: legacy.avatar,
      primaryHue: 120,
      bannerFocus: { x: 50, y: 50 },
      brandMark: "default",
      tagline: "",
      theme: { id: "classic", options: {} },
    };
    expect(await getSiteConfig(context)).toMatchObject(expected);
    const snapshot = await getAdminConfig(context);
    expect(snapshot.config.site).toMatchObject(expected);

    // The Admin form submits the snapshot's site section with its edits.
    await updateSystemConfig(context, {
      section: "site",
      expectedRevision: snapshot.revisions.site,
      site: { ...snapshot.config.site, primaryHue: 200, tagline: "Hello" },
    });
    const row = (await context.db.select().from(SystemConfigTable))[0];
    expect(row.configJson.schemaVersion).toBe(1);
    expect(row.configJson.site).toMatchObject({
      title: "Legacy",
      bannerImage: legacy.homeBg,
      avatar: legacy.avatar,
      primaryHue: 200,
      tagline: "Hello",
      theme: { id: "classic" },
    });
    // An older build reads only theme.fuwari, and finds the saved values there.
    expect(
      OlderBuildFuwariSchema.parse(row.configJson.site?.theme?.fuwari),
    ).toEqual({ ...legacy, primaryHue: 200 });
  });

  it("returns omitted fields, including the Theme options, to their defaults", async () => {
    const context = createTestContext();
    await updateSystemConfig(context, {
      section: "site",
      expectedRevision: 0,
      site: {
        bannerFocus: { x: 10, y: 90 },
        brandMark: "avatar",
        tagline: "Tagline",
        theme: { id: "classic", options: { classic: { future: true } } },
      },
    });
    expect((await getAdminConfig(context)).config.site).toMatchObject({
      bannerFocus: { x: 10, y: 90 },
      brandMark: "avatar",
      tagline: "Tagline",
      theme: { id: "classic", options: { classic: { future: true } } },
    });
    const saved = await updateSystemConfig(context, {
      section: "site",
      expectedRevision: 1,
      site: { title: "Only title" },
    });
    expect(saved.config.site).toMatchObject({
      bannerFocus: { x: 50, y: 50 },
      brandMark: "default",
      tagline: "",
      theme: { id: "classic", options: {} },
    });
  });

  it("accepts only registered Theme ids and valid shared fields", () => {
    const site = (value: Record<string, unknown>) =>
      UpdateConfigSectionSchema.safeParse({
        section: "site",
        expectedRevision: 0,
        site: value,
      }).success;
    expect(site({ theme: { id: "classic" } })).toBe(true);
    expect(site({ theme: { id: "retired" } })).toBe(false);
    expect(site({ bannerFocus: { x: 101, y: 50 } })).toBe(false);
    expect(site({ brandMark: "logo" })).toBe(false);
    expect(site({ tagline: "x".repeat(81) })).toBe(false);
  });
});

// Exercise the actual migration SQL against a separately named legacy table.
describe("System Config migration", () => {
  it.each([0, 1, 2])(
    "preserves data or refuses ambiguous legacy rows (%i)",
    async (count) => {
      const context = createTestContext();
      const { env } = await import("cloudflare:workers");
      const migration = env.TEST_MIGRATIONS.find((item) =>
        item.name.startsWith("0020_"),
      );
      expect(migration).toBeDefined();
      await context.env.DB.prepare(
        "CREATE TABLE config_fixture (id integer PRIMARY KEY AUTOINCREMENT, config_json text, updated_at integer NOT NULL DEFAULT (unixepoch()))",
      ).run();
      for (let i = 0; i < count; i++)
        await context.env.DB.prepare(
          "INSERT INTO config_fixture (config_json) VALUES (?)",
        )
          .bind(
            JSON.stringify({
              email: { apiKey: `fixture-${i}` },
              site: { title: `Legacy ${i}` },
            }),
          )
          .run();
      const statements = migration!.queries.map((query) =>
        context.env.DB.prepare(
          query.replaceAll("system_config", "config_fixture"),
        ),
      );
      if (count > 1) {
        await expect(context.env.DB.batch(statements)).rejects.toThrow();
        expect(
          (await context.env.DB.prepare("SELECT * FROM config_fixture").all())
            .results,
        ).toHaveLength(2);
      } else {
        await context.env.DB.batch(statements);
        const rows = (
          await context.env.DB.prepare("SELECT * FROM config_fixture").all()
        ).results;
        expect(rows).toHaveLength(count);
        if (count === 1) {
          expect(rows[0].id).toBe(1);
          expect(rows[0].site_revision).toBe(0);
          expect(JSON.parse(rows[0].config_json as string).email.apiKey).toBe(
            "fixture-0",
          );
        }
        await expect(
          context.env.DB.prepare(
            "INSERT INTO config_fixture (id, config_json) VALUES (2, '{}')",
          ).run(),
        ).rejects.toThrow();
      }
    },
  );
});
