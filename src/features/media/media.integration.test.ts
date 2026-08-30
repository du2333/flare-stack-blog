import {
  createAdminTestContext,
  seedUser,
  waitForBackgroundTasks,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JSONContent } from "@tiptap/react";
import * as PostService from "@/features/posts/services/posts.service";
import { unwrap } from "@/lib/errors";
import * as Storage from "./data/media.storage";
import * as MediaService from "./service/media.service";

/**
 * MediaService Tests
 *
 * R2 operations are mocked at the storage layer to avoid Miniflare R2 isolation issues.
 * These are integration tests focused on:
 * - Service layer logic
 * - DB operations (using real D1)
 * - Rollback behavior
 * - Post-Media relationships
 */
describe("MediaService", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;

  // Mock R2 storage functions
  beforeEach(async () => {
    adminContext = createAdminTestContext();
    await seedUser(adminContext.db, adminContext.session.user);

    // Mock R2 operations at storage layer to avoid Miniflare R2 isolation/serialization issues.
    // We trust the `r2-sanity.test.ts` (or equivalent verification) matches the platform behavior,
    // and here we focus on Service Logic + DB integration.

    vi.spyOn(Storage, "putToR2").mockImplementation(async (_env, file) => {
      const key = `mocked-${Date.now()}-${file.name}`;
      return {
        key,
        url: `/images/${key}`,
        fileName: file.name,
        mimeType: file.type,
        sizeInBytes: file.size,
      };
    });

    vi.spyOn(Storage, "deleteFromR2").mockResolvedValue(undefined);
    vi.spyOn(Storage, "getFromR2").mockResolvedValue(null);
  });

  // ============================================
  // 上传流程 (Upload Flow)
  // ============================================
  describe("Upload Flow", () => {
    it("should upload file and create DB record", async () => {
      const file = new File(["fake image content"], "test-image.png", {
        type: "image/png",
      });

      const result = unwrap(await MediaService.upload(adminContext, { file }));

      expect(result).toMatchObject({
        fileName: "test-image.png",
        mimeType: "image/png",
      });
      expect(result.key).toContain("mocked-");
      expect(result.url).toContain("/images/");

      // Verify Storage.putToR2 was called
      expect(Storage.putToR2).toHaveBeenCalledWith(adminContext.env, file);

      // Verify DB record was created
      const mediaList = await MediaService.getMediaList(adminContext, {});
      expect(mediaList.items.some((m) => m.key === result.key)).toBeTruthy();
    });

    it("should rollback R2 upload when DB insert fails", async () => {
      const file = new File(["test content"], "rollback-test.png", {
        type: "image/png",
      });

      // Make putToR2 work but insertMedia fail
      const mockKey = `rollback-key-${Date.now()}`;
      vi.mocked(Storage.putToR2).mockResolvedValueOnce({
        key: mockKey,
        url: `/images/${mockKey}`,
        fileName: file.name,
        mimeType: file.type,
        sizeInBytes: file.size,
      });

      // Import and mock the repo
      const MediaRepo = await import("./data/media.data");
      vi.spyOn(MediaRepo, "insertMedia").mockRejectedValueOnce(
        new Error("DB Error"),
      );

      const result = await MediaService.upload(adminContext, { file });
      expect(result.error?.reason).toBe("MEDIA_RECORD_CREATE_FAILED");

      // Wait for rollback
      await waitForBackgroundTasks(adminContext.executionCtx);

      // Verify deleteFromR2 was called with the uploaded key
      expect(Storage.deleteFromR2).toHaveBeenCalledWith(
        adminContext.env,
        mockKey,
      );
    });

    it("should calculate correct file size", async () => {
      const content = "x".repeat(1024); // 1KB
      const file = new File([content], "sized-file.jpg", {
        type: "image/jpeg",
      });

      const result = unwrap(await MediaService.upload(adminContext, { file }));

      expect(result.sizeInBytes).toBe(1024);
    });
  });

  // ============================================
  // 删除流程 (Deletion Flow)
  // ============================================
  describe("Deletion Flow", () => {
    it("should delete from both DB and trigger R2 cleanup", async () => {
      // First upload a file
      const file = new File(["delete me"], "to-delete.png", {
        type: "image/png",
      });
      const uploaded = unwrap(
        await MediaService.upload(adminContext, { file }),
      );

      // Reset mock to track deletion call
      vi.mocked(Storage.deleteFromR2).mockClear();

      // Delete it
      unwrap(await MediaService.deleteImage(adminContext, uploaded.key));

      // Wait for R2 deletion in waitUntil
      await waitForBackgroundTasks(adminContext.executionCtx);

      // Verify DB record is gone
      const mediaList = await MediaService.getMediaList(adminContext, {});
      expect(
        mediaList.items.find((m) => m.key === uploaded.key),
      ).toBeUndefined();

      // Verify R2 deleteFromR2 was called
      expect(Storage.deleteFromR2).toHaveBeenCalledWith(
        adminContext.env,
        uploaded.key,
      );
    });
  });

  // ============================================
  // 媒体查询 (Media Queries)
  // ============================================
  describe("Media Queries", () => {
    beforeEach(async () => {
      // Upload some test files
      for (let i = 1; i <= 5; i++) {
        const file = new File([`content ${i}`], `query-test-${i}.png`, {
          type: "image/png",
        });
        unwrap(await MediaService.upload(adminContext, { file }));
      }
    });

    it("should list media with pagination", async () => {
      const result = await MediaService.getMediaList(adminContext, {
        limit: 3,
      });

      expect(result.items).toHaveLength(3);
      expect(result.nextCursor).not.toBeNull();
    });

    it("should fetch next page using cursor", async () => {
      const firstPage = await MediaService.getMediaList(adminContext, {
        limit: 3,
      });
      const secondPage = await MediaService.getMediaList(adminContext, {
        limit: 3,
        cursor: firstPage.nextCursor!,
      });

      expect(secondPage.items).toHaveLength(2); // 5 total, 3 in first page
      expect(secondPage.nextCursor).toBeNull();

      // Ensure no duplicates between pages
      const firstIds = firstPage.items.map((m) => m.id);
      const secondIds = secondPage.items.map((m) => m.id);
      expect(firstIds.some((id) => secondIds.includes(id))).toBeFalsy();
    });

    it("should search media by filename", async () => {
      // Upload a uniquely named file
      const uniqueFile = new File(["unique"], "special-unique-file.png", {
        type: "image/png",
      });
      unwrap(await MediaService.upload(adminContext, { file: uniqueFile }));

      const result = await MediaService.getMediaList(adminContext, {
        search: "special-unique",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].fileName).toBe("special-unique-file.png");
    });

    it("should calculate total media size", async () => {
      const totalSize = await MediaService.getTotalMediaSize(adminContext);

      // 5 files with "content X" = roughly 9 bytes each
      expect(totalSize).toBeGreaterThan(0);
    });

    it("should update media filename", async () => {
      const file = new File(["rename me"], "original-name.png", {
        type: "image/png",
      });
      const uploaded = unwrap(
        await MediaService.upload(adminContext, { file }),
      );

      await MediaService.updateMediaName(adminContext, {
        key: uploaded.key,
        name: "new-fancy-name.png",
      });

      const list = await MediaService.getMediaList(adminContext, {
        search: "new-fancy-name",
      });
      expect(list.items).toHaveLength(1);
    });
  });

  function imageDoc(...keys: Array<string>): JSONContent {
    return {
      type: "doc",
      content: keys.map((key) => ({
        type: "image",
        attrs: { src: `/images/${key}` },
      })),
    };
  }

  async function setPostContent(postId: number, contentJson: JSONContent) {
    unwrap(
      await PostService.updatePost(adminContext, {
        id: postId,
        data: { contentJson },
      }),
    );
  }

  async function publishPost(postId: number) {
    unwrap(
      await PostService.updatePost(adminContext, {
        id: postId,
        data: { publishedAt: new Date() },
      }),
    );
    unwrap(await PostService.publishPost(adminContext, { id: postId }));
  }

  // ============================================
  // 文章-媒体关联 (Post-Media Relationships)
  // ============================================
  describe("Post-Media Relationships", () => {
    it("should track media usage in posts", async () => {
      const file = new File(["linked image"], "linked-image.png", {
        type: "image/png",
      });
      const media = unwrap(await MediaService.upload(adminContext, { file }));
      const { id: postId } = await PostService.createEmptyPost(adminContext);

      await setPostContent(postId, imageDoc(media.key));

      const isInUse = await MediaService.isMediaInUse(adminContext, media.key);
      expect(isInUse).toBe(true);

      const linkedPosts = await MediaService.getLinkedPosts(
        adminContext,
        media.key,
      );
      expect(linkedPosts).toHaveLength(1);
    });

    it("should return false for unused media", async () => {
      const file = new File(["unused"], "unused-image.png", {
        type: "image/png",
      });
      const media = unwrap(await MediaService.upload(adminContext, { file }));

      const isInUse = await MediaService.isMediaInUse(adminContext, media.key);
      expect(isInUse).toBe(false);
    });

    it("should batch check linked media keys", async () => {
      const files = ["batch-1.png", "batch-2.png", "batch-3.png"];
      const mediaKeys: Array<string> = [];

      for (const fileName of files) {
        const file = new File(["content"], fileName, { type: "image/png" });
        const media = unwrap(await MediaService.upload(adminContext, { file }));
        mediaKeys.push(media.key);
      }

      const { id: postId } = await PostService.createEmptyPost(adminContext);
      await setPostContent(postId, imageDoc(mediaKeys[0], mediaKeys[1]));

      const linkedKeys = await MediaService.getLinkedMediaKeys(
        adminContext,
        mediaKeys,
      );

      expect(linkedKeys).toHaveLength(2);
      expect(linkedKeys).toContain(mediaKeys[0]);
      expect(linkedKeys).toContain(mediaKeys[1]);
      expect(linkedKeys).not.toContain(mediaKeys[2]);
    });

    it("keeps published snapshot images locked after they leave the draft", async () => {
      const file = new File(["published image"], "published-image.png", {
        type: "image/png",
      });
      const media = unwrap(await MediaService.upload(adminContext, { file }));
      const { id: postId } = await PostService.createEmptyPost(adminContext);

      await setPostContent(postId, imageDoc(media.key));
      await publishPost(postId);
      await setPostContent(postId, { type: "doc", content: [] });

      expect(await MediaService.isMediaInUse(adminContext, media.key)).toBe(
        true,
      );
      expect(
        (await MediaService.deleteImage(adminContext, media.key)).error?.reason,
      ).toBe("MEDIA_IN_USE");

      const unused = await MediaService.getMediaList(adminContext, {
        unusedOnly: true,
      });
      expect(unused.items.some((item) => item.key === media.key)).toBe(false);
    });

    it("locks a Post Cover on the draft and on the public snapshot", async () => {
      const file = new File(["cover image"], "cover-image.png", {
        type: "image/png",
      });
      const media = unwrap(await MediaService.upload(adminContext, { file }));
      const { id: postId } = await PostService.createEmptyPost(adminContext);

      unwrap(
        await PostService.updatePost(adminContext, {
          id: postId,
          data: { coverMediaId: media.id },
        }),
      );

      expect(await MediaService.isMediaInUse(adminContext, media.key)).toBe(
        true,
      );

      await publishPost(postId);
      unwrap(
        await PostService.updatePost(adminContext, {
          id: postId,
          data: { coverMediaId: null },
        }),
      );

      expect(await MediaService.isMediaInUse(adminContext, media.key)).toBe(
        true,
      );
      expect(
        (await MediaService.deleteImage(adminContext, media.key)).error?.reason,
      ).toBe("MEDIA_IN_USE");

      unwrap(await PostService.unpublishPost(adminContext, { id: postId }));
      expect(await MediaService.isMediaInUse(adminContext, media.key)).toBe(
        false,
      );
    });

    it("unlocks snapshot-only images after unpublish if the draft no longer uses them", async () => {
      const file = new File(["unpublish image"], "unpublish-image.png", {
        type: "image/png",
      });
      const media = unwrap(await MediaService.upload(adminContext, { file }));
      const { id: postId } = await PostService.createEmptyPost(adminContext);

      await setPostContent(postId, imageDoc(media.key));
      await publishPost(postId);
      await setPostContent(postId, { type: "doc", content: [] });
      unwrap(await PostService.unpublishPost(adminContext, { id: postId }));

      expect(await MediaService.isMediaInUse(adminContext, media.key)).toBe(
        false,
      );
      unwrap(await MediaService.deleteImage(adminContext, media.key));
    });
  });
});
