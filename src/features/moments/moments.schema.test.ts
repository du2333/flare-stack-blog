import { describe, expect, it } from "vitest";
import {
  CreateMomentInputSchema,
  GetMomentsInputSchema,
  MomentsListResponseSchema,
  UpdateMomentInputSchema,
} from "./moments.schema";

describe("moments schema", () => {
  it("applies defaults and trims a valid moment", () => {
    const parsed = CreateMomentInputSchema.parse({
      content: "  今天的风很轻。  ",
      location: "  海边  ",
    });

    expect(parsed.type).toBe("moment");
    expect(parsed.content).toBe("今天的风很轻。");
    expect(parsed.images).toEqual([]);
    expect(parsed.location).toBe("海边");
  });

  it("accepts relative media URLs and rejects non-http schemes", () => {
    expect(
      CreateMomentInputSchema.parse({
        content: "两张照片",
        images: ["/images/yozora/still.jpg", "https://cdn.example.com/a.webp"],
      }).images,
    ).toHaveLength(2);

    expect(() =>
      CreateMomentInputSchema.parse({
        content: "bad",
        images: ["javascript:alert(1)"],
      }),
    ).toThrow();
  });

  it("caps images at nine", () => {
    expect(() =>
      CreateMomentInputSchema.parse({
        content: "too many",
        images: Array.from({ length: 10 }, (_, i) => `/img-${i}.jpg`),
      }),
    ).toThrow();
  });

  it("rejects blank content", () => {
    expect(() => CreateMomentInputSchema.parse({ content: "   " })).toThrow();
  });

  it("allows partial updates but keeps a valid date", () => {
    const parsed = UpdateMomentInputSchema.parse({
      id: 7,
      content: "更新",
      publishedAt: "2026-10-22T12:00:00.000Z",
    });

    expect(parsed.publishedAt).toBeInstanceOf(Date);
    expect(parsed.type).toBeUndefined();
  });

  it("only accepts moment or chatter types", () => {
    expect(() =>
      CreateMomentInputSchema.parse({ content: "x", type: "article" }),
    ).toThrow();
  });

  it("limits the public list size", () => {
    expect(GetMomentsInputSchema.parse({}).limit).toBe(50);
    expect(() => GetMomentsInputSchema.parse({ limit: 500 })).toThrow();
  });

  it("parses serialized dates in a list response", () => {
    const parsed = MomentsListResponseSchema.parse({
      items: [
        {
          id: 1,
          type: "moment",
          content: "hello",
          images: [],
          location: null,
          publishedAt: "2026-10-22T12:00:00.000Z",
          createdAt: "2026-10-22T12:00:00.000Z",
          updatedAt: "2026-10-22T12:00:00.000Z",
          deletedAt: null,
        },
      ],
      total: 1,
    });

    expect(parsed.items[0].publishedAt).toBeInstanceOf(Date);
  });
});
