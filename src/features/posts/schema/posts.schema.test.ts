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
});
