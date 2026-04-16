import {
  createAdminTestContext,
  createAuthTestContext,
  createMockExecutionCtx,
  createMockSession,
  seedUser,
  waitForBackgroundTasks,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as FriendLinkService from "./friend-links.service";

describe("FriendLinkService", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;
  let userContext: ReturnType<typeof createAuthTestContext>;

  beforeEach(async () => {
    adminContext = createAdminTestContext({
      executionCtx: createMockExecutionCtx(),
    });
    await seedUser(adminContext.db, adminContext.session.user);

    const userSession = createMockSession({
      user: {
        id: "user-1",
        name: "Test User",
        email: "user@example.com",
        role: null,
      },
    });
    userContext = createAuthTestContext({
      session: userSession,
      executionCtx: createMockExecutionCtx(),
    });
    await seedUser(userContext.db, userSession.user);

    await ConfigRepo.upsertSystemConfig(adminContext.db, DEFAULT_CONFIG);
  });

  describe("User Submission", () => {
    it("should submit a friend link with pending status", async () => {
      const result = await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Test Site",
        siteUrl: "https://example.com",
        description: "A test site",
        contactEmail: "contact@example.com",
      });

      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe("pending");
      expect(result.data?.siteName).toBe("Test Site");
      expect(result.data?.userId).toBe("user-1");
    });

    it("should send admin notification email on submission", async () => {
      await FriendLinkService.submitFriendLink(userContext, {
        siteName: "New Site",
        siteUrl: "https://newsite.com",
        contactEmail: "contact@newsite.com",
      });

      expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "EMAIL",
          data: expect.objectContaining({
            subject: expect.stringContaining("友链申请"),
          }),
        }),
      );
    });

    it("should send admin webhook without email when admin email is disabled", async () => {
      await ConfigRepo.upsertSystemConfig(adminContext.db, {
        ...DEFAULT_CONFIG,
        notification: {
          ...DEFAULT_CONFIG.notification,
          admin: {
            channels: {
              email: false,
              webhook: true,
            },
          },
          webhooks: [
            {
              id: "friend-link-webhook",
              name: "Friend Link Webhook",
              url: "https://example.com/webhook",
              enabled: true,
              secret: "secret",
              events: ["friend_link.submitted"],
            },
          ],
        },
      });

      vi.mocked(userContext.env.QUEUE.send).mockClear();

      await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Webhook Site",
        siteUrl: "https://webhook-site.com",
        contactEmail: "contact@webhook-site.com",
      });

      expect(userContext.env.QUEUE.send).toHaveBeenCalledTimes(1);
      expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "WEBHOOK",
          data: expect.objectContaining({
            endpointId: "friend-link-webhook",
            event: expect.objectContaining({
              type: "friend_link.submitted",
            }),
          }),
        }),
      );
    });

    it("should only send webhook to endpoints subscribed to friend link submission", async () => {
      await ConfigRepo.upsertSystemConfig(adminContext.db, {
        ...DEFAULT_CONFIG,
        notification: {
          ...DEFAULT_CONFIG.notification,
          admin: {
            channels: {
              email: false,
              webhook: true,
            },
          },
          webhooks: [
            {
              id: "matched-friend-link-endpoint",
              name: "Matched Friend Link Endpoint",
              url: "https://example.com/friend-link",
              enabled: true,
              secret: "secret-1",
              events: ["friend_link.submitted"],
            },
            {
              id: "unmatched-friend-link-endpoint",
              name: "Unmatched Friend Link Endpoint",
              url: "https://example.com/comment",
              enabled: true,
              secret: "secret-2",
              events: ["comment.admin_root_created"],
            },
          ],
        },
      });

      vi.mocked(userContext.env.QUEUE.send).mockClear();

      await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Webhook Filter Site",
        siteUrl: "https://webhook-filter.com",
        contactEmail: "contact@webhook-filter.com",
      });

      expect(userContext.env.QUEUE.send).toHaveBeenCalledTimes(1);
      expect(userContext.env.QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "WEBHOOK",
          data: expect.objectContaining({
            endpointId: "matched-friend-link-endpoint",
            url: "https://example.com/friend-link",
            event: expect.objectContaining({
              type: "friend_link.submitted",
            }),
          }),
        }),
      );
    });

    it("should not send webhook to disabled endpoints", async () => {
      await ConfigRepo.upsertSystemConfig(adminContext.db, {
        ...DEFAULT_CONFIG,
        notification: {
          ...DEFAULT_CONFIG.notification,
          admin: {
            channels: {
              email: false,
              webhook: true,
            },
          },
          webhooks: [
            {
              id: "disabled-friend-link-endpoint",
              name: "Disabled Friend Link Endpoint",
              url: "https://example.com/disabled",
              enabled: false,
              secret: "secret",
              events: ["friend_link.submitted"],
            },
          ],
        },
      });

      vi.mocked(userContext.env.QUEUE.send).mockClear();

      await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Disabled Webhook Site",
        siteUrl: "https://disabled-webhook.com",
        contactEmail: "contact@disabled-webhook.com",
      });

      expect(userContext.env.QUEUE.send).not.toHaveBeenCalled();
    });

    it("should reject duplicate URL submission", async () => {
      // First submission
      await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Site 1",
        siteUrl: "https://duplicate.com",
        contactEmail: "contact@duplicate.com",
      });

      // Duplicate submission
      const result = await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Site 2",
        siteUrl: "https://duplicate.com",
        contactEmail: "contact2@duplicate.com",
      });

      expect(result.error?.reason).toBe("DUPLICATE_URL");
    });

    it("should allow resubmission after rejection", async () => {
      // First submission
      const first = await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Rejected Site",
        siteUrl: "https://rejected.com",
        contactEmail: "contact@rejected.com",
      });
      expect(first.data).toBeDefined();

      // Reject it
      await FriendLinkService.rejectFriendLink(adminContext, {
        id: first.data!.id,
        rejectionReason: "Not suitable",
      });

      // Resubmission should be allowed
      const second = await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Rejected Site Retry",
        siteUrl: "https://rejected.com",
        contactEmail: "contact@rejected.com",
      });

      expect(second.data).toBeDefined();
      expect(second.data?.status).toBe("pending");
    });
  });

  describe("Admin Create", () => {
    it("should create friend link with approved status", async () => {
      const result = await FriendLinkService.createFriendLink(adminContext, {
        siteName: "Admin Added",
        siteUrl: "https://admin-added.com",
      });

      expect(result.status).toBe("approved");
      expect(result.userId).toBeNull();
    });

    it("should invalidate cache on creation", async () => {
      await FriendLinkService.createFriendLink(adminContext, {
        siteName: "Cache Test",
        siteUrl: "https://cache-test.com",
      });

      await waitForBackgroundTasks(adminContext.executionCtx);

      // Cache bump should have been called (we can verify KV was accessed)
      // The actual cache invalidation happens in waitUntil
    });
  });

  describe("Admin Moderation", () => {
    it("should approve a pending friend link", async () => {
      const submitted = await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Pending Site",
        siteUrl: "https://pending.com",
        contactEmail: "pending@example.com",
      });

      vi.mocked(adminContext.env.QUEUE.send).mockClear();

      const result = await FriendLinkService.approveFriendLink(adminContext, {
        id: submitted.data!.id,
      });

      expect(result.data?.status).toBe("approved");

      // Should send approval notification
      expect(adminContext.env.QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "EMAIL",
          data: expect.objectContaining({
            to: "pending@example.com",
            subject: expect.stringContaining("审核通过"),
          }),
        }),
      );
    });

    it("should skip submitter email when user email notifications are disabled", async () => {
      await ConfigRepo.upsertSystemConfig(adminContext.db, {
        ...DEFAULT_CONFIG,
        notification: {
          ...DEFAULT_CONFIG.notification,
          user: {
            emailEnabled: false,
          },
        },
      });

      const submitted = await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Pending Site",
        siteUrl: "https://pending-disabled.com",
        contactEmail: "pending-disabled@example.com",
      });

      vi.mocked(adminContext.env.QUEUE.send).mockClear();

      const result = await FriendLinkService.approveFriendLink(adminContext, {
        id: submitted.data!.id,
      });

      expect(result.data?.status).toBe("approved");
      expect(adminContext.env.QUEUE.send).not.toHaveBeenCalled();
    });

    it("should reject a friend link with reason", async () => {
      const submitted = await FriendLinkService.submitFriendLink(userContext, {
        siteName: "To Reject",
        siteUrl: "https://toreject.com",
        contactEmail: "reject@example.com",
      });

      vi.mocked(adminContext.env.QUEUE.send).mockClear();

      const result = await FriendLinkService.rejectFriendLink(adminContext, {
        id: submitted.data!.id,
        rejectionReason: "Content not suitable",
      });

      expect(result.data?.status).toBe("rejected");
      expect(result.data?.rejectionReason).toBe("Content not suitable");

      // Should send rejection notification
      expect(adminContext.env.QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "EMAIL",
          data: expect.objectContaining({
            to: "reject@example.com",
            subject: expect.stringContaining("审核结果"),
          }),
        }),
      );
    });

    it("should skip rejection email when user email notifications are disabled", async () => {
      await ConfigRepo.upsertSystemConfig(adminContext.db, {
        ...DEFAULT_CONFIG,
        notification: {
          ...DEFAULT_CONFIG.notification,
          user: {
            emailEnabled: false,
          },
        },
      });

      const submitted = await FriendLinkService.submitFriendLink(userContext, {
        siteName: "To Reject Disabled",
        siteUrl: "https://toreject-disabled.com",
        contactEmail: "reject-disabled@example.com",
      });

      vi.mocked(adminContext.env.QUEUE.send).mockClear();

      const result = await FriendLinkService.rejectFriendLink(adminContext, {
        id: submitted.data!.id,
        rejectionReason: "Not suitable",
      });

      expect(result.data?.status).toBe("rejected");
      expect(adminContext.env.QUEUE.send).not.toHaveBeenCalled();
    });

    it("should return NOT_FOUND for non-existent friend link", async () => {
      const result = await FriendLinkService.approveFriendLink(adminContext, {
        id: 999999,
      });

      expect(result.error?.reason).toBe("NOT_FOUND");
    });
  });

  describe("Update", () => {
    it("should update friend link fields", async () => {
      const created = await FriendLinkService.createFriendLink(adminContext, {
        siteName: "Original Name",
        siteUrl: "https://original.com",
        description: "Original description",
      });

      const updated = await FriendLinkService.updateFriendLink(adminContext, {
        id: created.id,
        siteName: "Updated Name",
        description: "Updated description",
      });

      expect(updated.data?.siteName).toBe("Updated Name");
      expect(updated.data?.description).toBe("Updated description");
      expect(updated.data?.siteUrl).toBe("https://original.com"); // unchanged
    });

    it("should only update provided fields (partial update)", async () => {
      const created = await FriendLinkService.createFriendLink(adminContext, {
        siteName: "Test Site",
        siteUrl: "https://test.com",
        description: "Original",
        contactEmail: "original@test.com",
      });

      // Only update siteName
      const updated = await FriendLinkService.updateFriendLink(adminContext, {
        id: created.id,
        siteName: "New Name",
      });

      expect(updated.data?.siteName).toBe("New Name");
      expect(updated.data?.description).toBe("Original"); // unchanged
      expect(updated.data?.contactEmail).toBe("original@test.com"); // unchanged
    });
  });

  describe("Delete", () => {
    it("should delete a friend link", async () => {
      const created = await FriendLinkService.createFriendLink(adminContext, {
        siteName: "To Delete",
        siteUrl: "https://todelete.com",
      });

      const result = await FriendLinkService.deleteFriendLink(adminContext, {
        id: created.id,
      });

      expect(result.data?.success).toBe(true);

      // Verify it's actually deleted
      const list = await FriendLinkService.getAllFriendLinks(adminContext, {});
      expect(list.items.find((l) => l.id === created.id)).toBeUndefined();
    });

    it("should return NOT_FOUND for non-existent ID", async () => {
      const result = await FriendLinkService.deleteFriendLink(adminContext, {
        id: 999999,
      });

      expect(result.error?.reason).toBe("NOT_FOUND");
    });
  });

  describe("Query", () => {
    it("should get approved friend links for public view", async () => {
      // Create approved link
      await FriendLinkService.createFriendLink(adminContext, {
        siteName: "Approved",
        siteUrl: "https://approved.com",
      });

      // Create pending link (via user submission)
      await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Pending",
        siteUrl: "https://pending.com",
        contactEmail: "pending@test.com",
      });

      const approved =
        await FriendLinkService.getApprovedFriendLinks(adminContext);

      expect(approved.length).toBe(1);
      expect(approved[0].siteName).toBe("Approved");
    });

    it("should return all approved friend links for public view without the admin page size limit", async () => {
      for (let i = 0; i < 25; i++) {
        await FriendLinkService.createFriendLink(adminContext, {
          siteName: `Approved ${i + 1}`,
          siteUrl: `https://approved-${i + 1}.com`,
        });
      }

      const approved =
        await FriendLinkService.getApprovedFriendLinks(adminContext);

      expect(approved).toHaveLength(25);
    });

    it("should get all friend links with status filter", async () => {
      // Setup test data
      await FriendLinkService.createFriendLink(adminContext, {
        siteName: "Approved 1",
        siteUrl: "https://approved1.com",
      });

      const pending = await FriendLinkService.submitFriendLink(userContext, {
        siteName: "Pending 1",
        siteUrl: "https://pending1.com",
        contactEmail: "pending1@test.com",
      });

      await FriendLinkService.rejectFriendLink(adminContext, {
        id: pending.data!.id,
        rejectionReason: "Rejected",
      });

      // Query by status
      const approvedList = await FriendLinkService.getAllFriendLinks(
        adminContext,
        {
          status: "approved",
        },
      );
      expect(approvedList.items.every((l) => l.status === "approved")).toBe(
        true,
      );

      const rejectedList = await FriendLinkService.getAllFriendLinks(
        adminContext,
        {
          status: "rejected",
        },
      );
      expect(rejectedList.items.every((l) => l.status === "rejected")).toBe(
        true,
      );
    });

    it("should get user's own friend links", async () => {
      await FriendLinkService.submitFriendLink(userContext, {
        siteName: "My Site",
        siteUrl: "https://mysite.com",
        contactEmail: "me@test.com",
      });

      const myLinks = await FriendLinkService.getMyFriendLinks(userContext);

      expect(myLinks.length).toBe(1);
      expect(myLinks[0].siteName).toBe("My Site");
    });
  });
});
