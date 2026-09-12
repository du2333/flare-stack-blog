import { createTestContext } from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { SystemConfigTable } from "@/lib/db/schema";
import {
  getAdminConfig,
  updateSystemConfig,
  resolveTestSecret,
  getSiteConfig,
} from "./service/config.service";
import { getSystemConfig } from "./data/config.data";
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
  it("enforces singleton identity in the database", async () => {
    const context = createTestContext();
    await expect(
      context.db.insert(SystemConfigTable).values({ id: 2, configJson: {} }),
    ).rejects.toThrow();
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
