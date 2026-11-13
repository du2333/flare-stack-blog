import { afterEach, describe, expect, it } from "vitest";
import { m } from "@/paraglide/messages";
import { getLocale, overwriteGetLocale } from "@/paraglide/runtime";
import {
  CreateFriendLinkInputSchema,
  createCreateFriendLinkSchema,
  createSubmitFriendLinkSchema,
  SubmitFriendLinkInputSchema,
  UpdateFriendLinkInputSchema,
} from "./friend-links.schema";

const listing = { siteName: "My site", siteUrl: "https://example.com" };

const runtimeGetLocale = getLocale;
afterEach(() => overwriteGetLocale(runtimeGetLocale));

describe("Friend Link input schemas", () => {
  it("refuses an admin update that tries to approve or reassign", () => {
    const base = { id: 1, ...listing };
    expect(UpdateFriendLinkInputSchema.safeParse(base).success).toBe(true);

    // Approval goes through /approve and /reject. Stripping these keys instead
    // of rejecting them answered 200 and left the application untouched.
    for (const smuggled of [
      { status: "approved" },
      { rejectionReason: "nope" },
      { userId: "someone-else" },
    ]) {
      expect(
        UpdateFriendLinkInputSchema.safeParse({ ...base, ...smuggled }).success,
      ).toBe(false);
    }
  });

  it.each([
    ["submit", SubmitFriendLinkInputSchema, { id: 1, ...listing }],
    ["create", CreateFriendLinkInputSchema, listing],
    ["update", UpdateFriendLinkInputSchema, { id: 1, ...listing }],
  ] as const)(
    "preserves listing field boundaries for %s",
    (_, schema, input) => {
      expect(schema.safeParse(input).success).toBe(true);
      expect(
        schema.safeParse({
          ...input,
          siteName: "x".repeat(100),
          description: "x".repeat(300),
          logoUrl: "",
        }).success,
      ).toBe(true);
      for (const invalid of [
        { siteName: "" },
        { siteName: "x".repeat(101) },
        { siteUrl: "example.com" },
        { description: "x".repeat(301) },
        { description: null },
        { logoUrl: "example.com/logo.png" },
        { logoUrl: null },
      ]) {
        expect(schema.safeParse({ ...input, ...invalid }).success).toBe(false);
      }
    },
  );

  it("keeps submission, manual creation, and partial update IDs distinct", () => {
    expect(SubmitFriendLinkInputSchema.parse(listing)).toEqual(listing);
    expect(SubmitFriendLinkInputSchema.parse({ id: 1, ...listing })).toEqual({
      id: 1,
      ...listing,
    });
    for (const id of [0, -1, 1.5, "1"]) {
      expect(
        SubmitFriendLinkInputSchema.safeParse({ ...listing, id }).success,
      ).toBe(false);
    }
    // Manual creation takes no id: an unknown field is refused, not dropped.
    expect(
      CreateFriendLinkInputSchema.safeParse({ id: 1, ...listing }).success,
    ).toBe(false);
    expect(UpdateFriendLinkInputSchema.safeParse({}).success).toBe(false);
    // The update's id is its path id: a positive whole number.
    for (const id of [0, -1, 1.5]) {
      expect(UpdateFriendLinkInputSchema.safeParse({ id }).success).toBe(false);
    }
    expect(UpdateFriendLinkInputSchema.parse({ id: 1 })).toEqual({ id: 1 });
    expect(UpdateFriendLinkInputSchema.parse({ id: 1, logoUrl: "" })).toEqual({
      id: 1,
      logoUrl: "",
    });
  });

  it.each([
    ["submit", createSubmitFriendLinkSchema],
    ["create", createCreateFriendLinkSchema],
  ] as const)(
    "captures localized %s errors when the form is created",
    (_, createSchema) => {
      overwriteGetLocale(() => "en");
      const englishSchema = createSchema();
      overwriteGetLocale(() => "zh");
      const chineseSchema = createSchema();

      for (const [schema, errorLocale] of [
        [englishSchema, "en"],
        [chineseSchema, "zh"],
      ] as const) {
        const result = schema.safeParse({
          siteName: "",
          siteUrl: "not a URL",
          description: "x".repeat(301),
        });
        expect(result.error?.issues.map((issue) => issue.message)).toEqual([
          m.friend_link_validation_required({}, { locale: errorLocale }),
          m.friend_link_validation_invalid_url({}, { locale: errorLocale }),
          m.friend_link_validation_too_long(
            { max: 300 },
            { locale: errorLocale },
          ),
        ]);
      }
    },
  );
});
