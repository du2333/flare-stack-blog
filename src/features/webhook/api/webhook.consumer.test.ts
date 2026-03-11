import { describe, expect, it } from "vitest";
import type { NotificationEvent } from "@/features/notification/notification.schema";
import { createWebhookBody } from "./webhook.consumer";

const commentEvent: NotificationEvent = {
  type: "comment.admin_root_created",
  data: {
    to: "admin@example.com",
    postTitle: "My Blog Post",
    commenterName: "Alice",
    commentPreview: "Great article!",
    commentUrl: "https://example.com/post#c1",
  },
};

const friendLinkSubmittedEvent: NotificationEvent = {
  type: "friend_link.submitted",
  data: {
    to: "admin@example.com",
    siteName: "Alice's Blog",
    siteUrl: "https://alice.example.com",
    description: "A cool blog",
    submitterName: "Alice",
    reviewUrl: "https://example.com/admin/friend-links/1",
  },
};

const friendLinkRejectedWithReasonEvent: NotificationEvent = {
  type: "friend_link.rejected",
  data: {
    to: "user@example.com",
    siteName: "Alice's Blog",
    rejectionReason: "Not suitable",
  },
};

const friendLinkRejectedWithoutReasonEvent: NotificationEvent = {
  type: "friend_link.rejected",
  data: {
    to: "user@example.com",
    siteName: "Bob's Blog",
  },
};

describe("createWebhookBody", () => {
  it("should include required envelope fields", () => {
    const body = createWebhookBody("msg-123", commentEvent);

    expect(body.id).toBe("msg-123");
    expect(body.type).toBe("comment.admin_root_created");
    expect(body.source).toBe("flare-stack-blog");
    expect(body.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
    );
  });

  it("should set test: false by default", () => {
    const body = createWebhookBody("msg-1", commentEvent);
    expect(body.test).toBe(false);
  });

  it("should set test: true when isTest option is passed", () => {
    const body = createWebhookBody("msg-1", commentEvent, { isTest: true });
    expect(body.test).toBe(true);
  });

  it("should embed raw event data", () => {
    const body = createWebhookBody("msg-1", commentEvent);
    expect(body.data).toEqual(commentEvent.data);
  });

  it("should include rendered email subject and html", () => {
    const body = createWebhookBody("msg-1", commentEvent);
    expect(typeof body.subject).toBe("string");
    expect(body.subject.length).toBeGreaterThan(0);
    expect(typeof body.html).toBe("string");
    expect(body.html.length).toBeGreaterThan(0);
  });

  describe("plain text message", () => {
    it("should format comment.admin_root_created correctly", () => {
      const body = createWebhookBody("msg-1", commentEvent);
      expect(body.message).toContain("Alice");
      expect(body.message).toContain("My Blog Post");
      expect(body.message).toContain("Great article!");
      expect(body.message).toContain("https://example.com/post#c1");
    });

    it("should format friend_link.submitted correctly", () => {
      const body = createWebhookBody("msg-1", friendLinkSubmittedEvent);
      expect(body.message).toContain("Alice");
      expect(body.message).toContain("Alice's Blog");
      expect(body.message).toContain("https://alice.example.com");
    });

    it("should include rejection reason in friend_link.rejected when present", () => {
      const body = createWebhookBody(
        "msg-1",
        friendLinkRejectedWithReasonEvent,
      );
      expect(body.message).toContain("Not suitable");
    });

    it("should omit rejection reason in friend_link.rejected when absent", () => {
      const body = createWebhookBody(
        "msg-1",
        friendLinkRejectedWithoutReasonEvent,
      );
      expect(body.message).toContain("Bob's Blog");
      expect(body.message).not.toContain("undefined");
    });
  });
});
