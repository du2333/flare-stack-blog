import { describe, expect, it } from "vitest";
import { UpdatePostInputSchema } from "@/features/posts/schema/posts.schema";

describe("posts.schema", () => {
  it("strips publicContentJson from update input", () => {
    const result = UpdatePostInputSchema.parse({
      id: 1,
      data: {
        publicContentJson: {
          type: "doc",
          content: [],
        },
      },
    });

    expect(result.data).not.toHaveProperty("publicContentJson");
  });

  it("accepts valid TipTap JSONContent in update input", () => {
    const result = UpdatePostInputSchema.safeParse({
      id: 1,
      data: {
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello MCP" }],
            },
          ],
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects text nodes with child content", () => {
    const result = UpdatePostInputSchema.safeParse({
      id: 1,
      data: {
        contentJson: {
          type: "text",
          text: "invalid",
          content: [],
        },
      },
    });

    expect(result.success).toBe(false);
  });
});
