import { describe, expect, it } from "vitest";
import { createWebhookBody } from "@/features/webhook/api/webhook.consumer";

describe("createWebhookBody", () => {
  it("sends type, data, and message without email fields", () => {
    const body = createWebhookBody(
      "msg_1",
      {
        type: "comment.admin_root_created",
        data: {
          postTitle: "Hello",
          commenterName: "Ada",
          commentPreview: "Nice post",
          commentUrl: "https://example.com/post/hello?comment=1",
        },
      },
      { isTest: true },
      "en",
    );

    expect(body).toEqual({
      id: "msg_1",
      type: "comment.admin_root_created",
      timestamp: expect.any(String),
      test: true,
      data: {
        postTitle: "Hello",
        commenterName: "Ada",
        commentPreview: "Nice post",
        commentUrl: "https://example.com/post/hello?comment=1",
      },
      message: expect.stringContaining("Ada"),
    });
    expect(body).not.toHaveProperty("html");
    expect(body).not.toHaveProperty("subject");
    expect(body).not.toHaveProperty("source");
    expect(body.data).not.toHaveProperty("to");
  });
});
