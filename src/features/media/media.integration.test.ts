import {
  createAdminTestContext,
  createMockSession,
  seedUser,
  waitForBackgroundTasks,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JSONContent } from "@tiptap/react";
import { eq } from "drizzle-orm";
import { user } from "@/lib/db/schema";
import { purgeWorkersCache } from "@/features/cache/workers-cache";
import { mediaPurgeTarget } from "@/features/cache/workers-cache-policy";
import * as PostRevisionService from "@/features/posts/services/post-revisions.service";
import * as PostService from "@/features/posts/services/posts.service";
import { unwrap } from "@/lib/errors";
import * as Storage from "./data/media.storage";
import { MAX_FILE_SIZE } from "./media.schema";
import * as MediaService from "./service/media.service";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A file whose bytes start like a PNG, so uploads accept it. */
function pngFile(name: string, content: string) {
  return new File([new Uint8Array(PNG_SIGNATURE), content], name, {
    type: "image/png",
  });
}

/** A JPEG-signed file of exactly `size` bytes. */
function jpegFile(name: string, size: number) {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return new File([bytes], name, { type: "image/jpeg" });
}

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

    vi.spyOn(Storage, "putToR2").mockImplementation(async (_env, file, key) => {
      const nextKey = key ?? `mocked-${Date.now()}-${file.name}`;
      return {
        key: nextKey,
        url: `/images/${nextKey}`,
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
      const file = pngFile("test-image.png", "fake image content");

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
      const file = pngFile("rollback-test.png", "test content");

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

    it("refuses a file whose bytes are not the declared type", async () => {
      const result = await MediaService.upload(adminContext, {
        file: new File(["just text"], "fake.png", { type: "image/png" }),
      });

      expect(result.error?.reason).toBe("MEDIA_INVALID");
      expect(Storage.putToR2).not.toHaveBeenCalled();
    });

    it("should calculate correct file size", async () => {
      const file = jpegFile("sized-file.jpg", 1024); // 1KB

      const result = unwrap(await MediaService.upload(adminContext, { file }));

      expect(result.sizeInBytes).toBe(1024);
    });
  });

  // ============================================
  // 删除流程 (Deletion Flow)
  // ============================================
  describe("Deletion Flow", () => {
    it("reports an unknown key instead of deleting nothing", async () => {
      const result = await MediaService.deleteImage(
        adminContext,
        "missing.png",
      );
      expect(result.error?.reason).toBe("MEDIA_NOT_FOUND");
    });

    it("reports an unknown key instead of renaming nothing", async () => {
      const result = await MediaService.updateMediaName(adminContext, {
        key: "missing.png",
        name: "new.png",
      });
      expect(result.error?.reason).toBe("MEDIA_NOT_FOUND");
    });

    it("should delete from both DB and trigger R2 cleanup", async () => {
      // First upload a file
      const file = pngFile("to-delete.png", "delete me");
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
        const file = pngFile(`query-test-${i}.png`, `content ${i}`);
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
      const uniqueFile = pngFile("special-unique-file.png", "unique");
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

    it("reports library stats including unused count", async () => {
      const stats = await MediaService.getMediaStats(adminContext);
      expect(stats.totalCount).toBeGreaterThanOrEqual(5);
      expect(stats.unusedCount).toBe(stats.totalCount);
      expect(stats.totalBytes).toBeGreaterThan(0);
    });

    it("should update media filename", async () => {
      const file = pngFile("original-name.png", "rename me");
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

  async function deleteAllRevisions(postId: number) {
    const revisions = await PostRevisionService.listPostRevisions(
      adminContext,
      { postId },
    );
    unwrap(
      await PostRevisionService.deletePostRevisions(adminContext, {
        postId,
        revisionIds: revisions.map((revision) => revision.id),
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

  describe("Media sort", () => {
    // Uploaded in this order; c and d are the same size.
    const uploads = [
      ["sort-a.jpg", 3000],
      ["sort-b.jpg", 1000],
      ["sort-c.jpg", 2000],
      ["sort-d.jpg", 2000],
      ["sort-e.jpg", 500],
    ] as const;
    type ListOptions = NonNullable<
      Parameters<typeof MediaService.getMediaList>[1]
    >;
    const named = (...letters: Array<string>) =>
      letters.map((letter) => `sort-${letter}.jpg`);

    async function listPage(options: ListOptions) {
      const page = await MediaService.getMediaList(adminContext, options);
      return {
        names: page.items.map((item) => item.fileName),
        nextCursor: page.nextCursor,
      };
    }

    /** Every page of the list, `limit` items at a time. */
    async function listAll(options: ListOptions, limit: number) {
      const names: Array<string> = [];
      let cursor: number | undefined;
      do {
        const page = await listPage({ ...options, limit, cursor });
        names.push(...page.names);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return names;
    }

    beforeEach(async () => {
      for (const [name, size] of uploads) {
        unwrap(
          await MediaService.upload(adminContext, {
            file: jpegFile(name, size),
          }),
        );
      }
    });

    it("lists the newest upload first by default", async () => {
      const expected = named("e", "d", "c", "b", "a");
      expect((await listPage({})).names).toEqual(expected);
      expect((await listPage({ sort: "newest" })).names).toEqual(expected);
    });

    it("lists the earliest upload first for oldest", async () => {
      expect((await listPage({ sort: "oldest" })).names).toEqual(
        named("a", "b", "c", "d", "e"),
      );
    });

    it("lists the largest file first, equal sizes newest first", async () => {
      expect((await listPage({ sort: "largest" })).names).toEqual(
        named("a", "d", "c", "b", "e"),
      );
    });

    it("continues each sort from its cursor without skipping or repeating", async () => {
      for (const sort of ["newest", "oldest", "largest"] as const) {
        const whole = (await listPage({ sort })).names;
        expect(await listAll({ sort }, 2)).toEqual(whole);
        expect(await listAll({ sort }, 1)).toEqual(whole);
      }
    });

    it("ends the last page of every sort with a null cursor", async () => {
      for (const sort of ["newest", "oldest", "largest"] as const) {
        expect((await listPage({ sort, limit: 5 })).nextCursor).toBeNull();
      }
    });

    it("sorts and pages a search result", async () => {
      expect(await listAll({ sort: "largest", search: "sort-" }, 2)).toEqual(
        named("a", "d", "c", "b", "e"),
      );
      expect(await listAll({ sort: "largest", search: "-c." }, 1)).toEqual(
        named("c"),
      );
    });

    it("keeps unusedOnly and sort together", async () => {
      const { items } = await MediaService.getMediaList(adminContext, {
        search: "sort-a",
      });
      const { id: postId } = await PostService.createEmptyPost(adminContext);
      await setPostContent(postId, imageDoc(items[0].key));

      expect(await listAll({ sort: "largest", unusedOnly: true }, 2)).toEqual(
        named("d", "c", "b", "e"),
      );
    });
  });

  // ============================================
  // 文章-媒体关联 (Post-Media Relationships)
  // ============================================
  describe("Post-Media Relationships", () => {
    it("should track media usage in posts", async () => {
      const file = pngFile("linked-image.png", "linked image");
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
      const file = pngFile("unused-image.png", "unused");
      const media = unwrap(await MediaService.upload(adminContext, { file }));

      const isInUse = await MediaService.isMediaInUse(adminContext, media.key);
      expect(isInUse).toBe(false);
    });

    it("should batch check linked media keys", async () => {
      const files = ["batch-1.png", "batch-2.png", "batch-3.png"];
      const mediaKeys: Array<string> = [];

      for (const fileName of files) {
        const file = pngFile(fileName, "content");
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
      const file = pngFile("published-image.png", "published image");
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
      const file = pngFile("cover-image.png", "cover image");
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

      const listed = await MediaService.getMediaList(adminContext, {});
      expect(listed.items.find((item) => item.key === media.key)?.isCover).toBe(
        true,
      );
      const linked = await MediaService.getLinkedPosts(adminContext, media.key);
      expect(linked).toHaveLength(1);
      expect(linked[0].isCover).toBe(true);

      unwrap(await PostService.unpublishPost(adminContext, { id: postId }));
      // The publish revision still has it as its cover.
      expect(await MediaService.isMediaInUse(adminContext, media.key)).toBe(
        true,
      );
      await deleteAllRevisions(postId);
      expect(await MediaService.isMediaInUse(adminContext, media.key)).toBe(
        false,
      );
    });

    it("keeps an image only a Post Revision uses until the revision is deleted", async () => {
      const file = pngFile("revision-image.png", "revision image");
      const media = unwrap(await MediaService.upload(adminContext, { file }));
      const { id: postId } = await PostService.createEmptyPost(adminContext);

      await setPostContent(postId, imageDoc(media.key));
      await publishPost(postId);
      await setPostContent(postId, { type: "doc", content: [] });
      unwrap(await PostService.unpublishPost(adminContext, { id: postId }));

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
      const stats = await MediaService.getMediaStats(adminContext);
      expect(stats.unusedCount).toBe(0);
      unwrap(await MediaService.deleteUnused(adminContext));

      const listed = await MediaService.getMediaList(adminContext, {});
      expect(listed.items.find((item) => item.key === media.key)).toMatchObject(
        { postCount: 0, revisionOnlyPostCount: 1, isCover: false },
      );
      expect(
        await MediaService.getLinkedMediaKeys(adminContext, [media.key]),
      ).toEqual([media.key]);
      expect(
        await MediaService.getLinkedPosts(adminContext, media.key),
      ).toEqual([
        expect.objectContaining({
          id: postId,
          isCover: false,
          revisionsOnly: true,
        }),
      ]);

      await deleteAllRevisions(postId);
      expect(await MediaService.isMediaInUse(adminContext, media.key)).toBe(
        false,
      );
      unwrap(await MediaService.deleteImage(adminContext, media.key));
    });

    it("counts a post that uses the image only in revisions apart from one that uses it in its published version", async () => {
      const media = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("mixed.png", "mixed"),
        }),
      );
      const { id: current } = await PostService.createEmptyPost(adminContext);
      await setPostContent(current, imageDoc(media.key));
      await publishPost(current);
      // An empty draft is reused, so this one is made once `current` has content.
      const { id: historic } = await PostService.createEmptyPost(adminContext);
      await setPostContent(historic, imageDoc(media.key));
      await publishPost(historic);
      await setPostContent(historic, { type: "doc", content: [] });
      unwrap(await PostService.unpublishPost(adminContext, { id: historic }));

      const listed = await MediaService.getMediaList(adminContext, {});
      expect(listed.items.find((item) => item.key === media.key)).toMatchObject(
        { postCount: 1, revisionOnlyPostCount: 1 },
      );
    });

    it("keeps the images of the backup a restore saves", async () => {
      const kept = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("before-restore.png", "kept"),
        }),
      );
      const { id: postId } = await PostService.createEmptyPost(adminContext);
      await publishPost(postId);
      const [published] = await PostRevisionService.listPostRevisions(
        adminContext,
        { postId },
      );
      await setPostContent(postId, imageDoc(kept.key));

      // Restoring the empty publish revision first saves the draft, which
      // has the image, as a backup revision.
      unwrap(
        await PostRevisionService.restorePostRevision(adminContext, {
          postId,
          revisionId: published.id,
        }),
      );

      expect(await MediaService.getLinkedPosts(adminContext, kept.key)).toEqual(
        [expect.objectContaining({ id: postId, revisionsOnly: true })],
      );
      expect(
        (await MediaService.deleteImage(adminContext, kept.key)).error?.reason,
      ).toBe("MEDIA_IN_USE");
    });

    it("counts a post once when its draft and revisions both use the image", async () => {
      const media = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("both.png", "both"),
        }),
      );
      const { id: postId } = await PostService.createEmptyPost(adminContext);
      await setPostContent(postId, imageDoc(media.key));
      await publishPost(postId);

      const listed = await MediaService.getMediaList(adminContext, {});
      expect(listed.items.find((item) => item.key === media.key)).toMatchObject(
        { postCount: 1, revisionOnlyPostCount: 0 },
      );
      expect(
        await MediaService.getLinkedPosts(adminContext, media.key),
      ).toEqual([
        expect.objectContaining({ id: postId, revisionsOnly: false }),
      ]);
    });

    it("marks a Post Cover on linked posts", async () => {
      const file = pngFile("cover-flag.png", "cover");
      const media = unwrap(await MediaService.upload(adminContext, { file }));
      const { id: postId } = await PostService.createEmptyPost(adminContext);
      unwrap(
        await PostService.updatePost(adminContext, {
          id: postId,
          data: { coverMediaId: media.id },
        }),
      );

      const linked = await MediaService.getLinkedPosts(adminContext, media.key);
      expect(linked).toHaveLength(1);
      expect(linked[0].isCover).toBe(true);
    });
  });

  describe("Replace and import", () => {
    it("replaces the file at the same key", async () => {
      const original = jpegFile("old.jpg", 32);
      const uploaded = unwrap(
        await MediaService.upload(adminContext, { file: original }),
      );
      const next = jpegFile("new.jpg", 64);
      const replaced = unwrap(
        await MediaService.replaceImage(adminContext, {
          key: uploaded.key,
          file: next,
        }),
      );

      expect(replaced.key).toBe(uploaded.key);
      expect(replaced.fileName).toBe("new.jpg");
      expect(replaced.mimeType).toBe("image/jpeg");
      expect(replaced.sizeInBytes).toBe(next.size);
      expect(Storage.putToR2).toHaveBeenCalledWith(
        adminContext.env,
        next,
        uploaded.key,
      );
    });

    it("serves a replaced file at the same addresses without writing posts", async () => {
      const media = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("banner.png", "old"),
        }),
      );
      const { id: postId } = await PostService.createEmptyPost(adminContext);
      await setPostContent(postId, imageDoc(media.key));
      await publishPost(postId);
      const before = await PostService.findPostById(adminContext, {
        id: postId,
      });
      vi.mocked(purgeWorkersCache).mockClear();

      const replaced = unwrap(
        await MediaService.replaceImage(adminContext, {
          key: media.key,
          file: pngFile("banner.png", "new"),
        }),
      );

      // The record's own address changes so an open media library reloads it.
      expect(replaced.url).toMatch(
        new RegExp(`^/images/${media.key}\\?v=\\d+$`),
      );
      const after = await PostService.findPostById(adminContext, {
        id: postId,
      });
      expect(after?.hasUnpublishedChanges).toBe(false);
      expect(after?.saveToken).toBe(before?.saveToken);
      expect(after?.contentJson).toEqual(before?.contentJson);
      expect(after?.publicSnapshotContentJson).toEqual(
        before?.publicSnapshotContentJson,
      );
      // Every cached copy of the key goes, so the post's addresses answer
      // with the new file.
      expect(
        vi.mocked(purgeWorkersCache).mock.calls.map((call) => call.slice(1)),
      ).toEqual([[mediaPurgeTarget(media.key)]]);
    });

    it("refuses a replacement whose bytes are not the declared type", async () => {
      const media = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("keep.png", "old"),
        }),
      );
      vi.mocked(Storage.putToR2).mockClear();

      const result = await MediaService.replaceImage(adminContext, {
        key: media.key,
        file: new File(["plain text"], "keep.png", { type: "image/png" }),
      });

      expect(result.error?.reason).toBe("MEDIA_INVALID");
      expect(Storage.putToR2).not.toHaveBeenCalled();
    });

    it("refuses a replacement of another image type, writing nothing", async () => {
      const media = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("keep.png", "old"),
        }),
      );
      vi.mocked(Storage.putToR2).mockClear();
      vi.mocked(purgeWorkersCache).mockClear();

      const asJpeg = await MediaService.replaceImage(adminContext, {
        key: media.key,
        file: jpegFile("other.jpg", 64),
      });
      expect(asJpeg.error).toEqual({
        reason: "MEDIA_INVALID",
        detail: "TYPE_CHANGED",
      });
      const asSvg = await MediaService.replaceImage(adminContext, {
        key: media.key,
        file: new File(
          ['<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>'],
          "other.svg",
          { type: "image/svg+xml" },
        ),
      });
      expect(asSvg.error).toEqual({
        reason: "MEDIA_INVALID",
        detail: "TYPE_CHANGED",
      });

      expect(Storage.putToR2).not.toHaveBeenCalled();
      expect(purgeWorkersCache).not.toHaveBeenCalled();
      const [kept] = (
        await MediaService.getMediaList(adminContext, { search: "keep" })
      ).items;
      expect(kept).toMatchObject({
        fileName: "keep.png",
        mimeType: "image/png",
      });
    });

    it("takes jpg and jpeg as one type when replacing", async () => {
      const media = unwrap(
        await MediaService.upload(adminContext, {
          file: new File(
            [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])],
            "photo.jpg",
            { type: "image/jpg" },
          ),
        }),
      );
      const replaced = await MediaService.replaceImage(adminContext, {
        key: media.key,
        file: jpegFile("photo2.jpeg", 40),
      });
      expect(replaced.error).toBeNull();
    });

    it("cleans the file name of an upload and of a replacement", async () => {
      const media = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("a\u202Eb\u0000.png", "named"),
        }),
      );
      expect(media.fileName).toBe("ab.png");

      const replaced = unwrap(
        await MediaService.replaceImage(adminContext, {
          key: media.key,
          file: pngFile("\u200B  \t", "again"),
        }),
      );
      // Nothing usable left in the new name: the old one stays.
      expect(replaced.fileName).toBe("ab.png");

      const long = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile(`${"n".repeat(400)}.png`, "long"),
        }),
      );
      expect(long.fileName).toHaveLength(255);
      expect(long.fileName.endsWith(".png")).toBe(true);
    });

    describe("naming an imported image", () => {
      function serve(contentType: string, body: BodyInit) {
        vi.stubGlobal(
          "fetch",
          vi.fn(async (input: URL) => {
            const url = new URL(input);
            if (url.hostname === "cloudflare-dns.com") {
              return Response.json({
                Status: 0,
                Answer:
                  url.searchParams.get("type") === "A"
                    ? [{ type: 1, data: "93.184.216.34" }]
                    : [],
              });
            }
            return new Response(body, {
              status: 200,
              headers: { "content-type": contentType },
            });
          }),
        );
      }

      it.each([
        [
          "a name in the path",
          "https://example.com/photos/sunset.png",
          undefined,
          "sunset.png",
        ],
        [
          "a path with an encoded name",
          "https://example.com/p/%E6%97%A5%E8%90%BD.png",
          undefined,
          "日落.png",
        ],
        [
          "a path with no extension",
          "https://example.com/photos/12345",
          undefined,
          "12345.png",
        ],
        [
          "a query string only",
          "https://example.com/photos/12345?size=large",
          undefined,
          "12345.png",
        ],
        [
          "another image extension",
          "https://example.com/photos/pic.jpg",
          undefined,
          "pic.png",
        ],
        [
          "a dotted name that is no extension",
          "https://example.com/files/v1.2",
          undefined,
          "v1.2.png",
        ],
        ["no path", "https://example.com/", undefined, "image.png"],
        [
          "a broken escape",
          "https://example.com/%E0%A4%A.png",
          undefined,
          "image.png",
        ],
        [
          "a name sent with it",
          "https://example.com/photos/12345",
          "Team photo",
          "Team photo.png",
        ],
        [
          "a name sent with its own extension",
          "https://example.com/x",
          "cover.PNG",
          "cover.PNG",
        ],
        [
          "a name sent with another extension",
          "https://example.com/x",
          "cover.jpeg",
          "cover.png",
        ],
      ])("names it after %s", async (_case, url, name, expected) => {
        serve("image/png", await pngFile("x.png", "x").arrayBuffer());
        const result = unwrap(
          await MediaService.importFromUrl(adminContext, { url, name }),
        );
        expect(result.fileName).toBe(expected);
        // The key takes its extension from the name, so it names the type.
        expect(result.key.toLowerCase().endsWith(".png")).toBe(true);
        vi.unstubAllGlobals();
      });

      it("gives an SVG the svg extension, not svg+xml", async () => {
        serve(
          "image/svg+xml",
          '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>',
        );
        const result = unwrap(
          await MediaService.importFromUrl(adminContext, {
            url: "https://example.com/logo",
          }),
        );
        expect(result.fileName).toBe("logo.svg");
        vi.unstubAllGlobals();
      });
    });

    it("imports a public image URL into Media", async () => {
      const bytes = await pngFile("download.png", "x").arrayBuffer();
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: URL) => {
          const url = new URL(input);
          if (url.hostname === "cloudflare-dns.com") {
            return Response.json({
              Status: 0,
              Answer:
                url.searchParams.get("type") === "A"
                  ? [{ type: 1, data: "93.184.216.34" }]
                  : [],
            });
          }
          return new Response(bytes, {
            status: 200,
            headers: { "content-type": "image/png" },
          });
        }),
      );

      const result = unwrap(
        await MediaService.importFromUrl(adminContext, {
          url: "https://example.com/photos/sunset.png",
        }),
      );

      expect(result.fileName).toBe("sunset.png");
      expect(result.mimeType).toBe("image/png");
      vi.unstubAllGlobals();
    });

    it("says why an imported response is refused", async () => {
      const respond = (body: BodyInit, contentType: string) =>
        vi.stubGlobal(
          "fetch",
          vi.fn(async (input: URL) => {
            const url = new URL(input);
            if (url.hostname === "cloudflare-dns.com") {
              return Response.json({
                Status: 0,
                Answer:
                  url.searchParams.get("type") === "A"
                    ? [{ type: 1, data: "93.184.216.34" }]
                    : [],
              });
            }
            return new Response(body, {
              status: 200,
              headers: { "content-type": contentType },
            });
          }),
        );
      const importResult = () =>
        MediaService.importFromUrl(adminContext, {
          url: "https://example.com/photos/a.png",
        });

      respond("<html></html>", "text/html");
      expect((await importResult()).error).toEqual({
        reason: "MEDIA_INVALID",
        detail: "TYPE_UNRECOGNIZED",
      });

      respond(new Uint8Array(0), "image/png");
      expect((await importResult()).error).toEqual({
        reason: "MEDIA_INVALID",
        detail: "EMPTY",
      });

      respond(new Uint8Array(MAX_FILE_SIZE + 1), "image/png");
      expect((await importResult()).error).toEqual({
        reason: "MEDIA_INVALID",
        detail: "TOO_LARGE",
      });

      respond("not a png", "image/png");
      expect((await importResult()).error).toEqual({
        reason: "MEDIA_INVALID",
        detail: "TYPE_MISMATCH",
      });
      vi.unstubAllGlobals();
    });

    it.each([
      "http://127.0.0.1/secret.png",
      "http://[::ffff:127.0.0.1]:3000/secret.png",
      "http://[::1]:3000/secret.png",
      "http://localhost:3000/secret.png",
    ])("rejects the private import URL %s", async (url) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const result = await MediaService.importFromUrl(adminContext, { url });
      expect(result.error?.reason).toBe("MEDIA_INVALID_URL");
      expect(fetchMock).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it("rejects a name that resolves to loopback and a redirect to one", async () => {
      const fetchMock = vi.fn(async (input: URL) => {
        const url = new URL(input);
        if (url.hostname === "cloudflare-dns.com") {
          const name = url.searchParams.get("name");
          const isA = url.searchParams.get("type") === "A";
          return Response.json({
            Status: 0,
            Answer: isA
              ? [
                  {
                    type: 1,
                    data:
                      name === "localtest.me" ? "127.0.0.1" : "93.184.216.34",
                  },
                ]
              : [],
          });
        }
        return new Response(null, {
          status: 302,
          headers: { location: "http://[::ffff:7f00:1]:3000/secret.png" },
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      const resolved = await MediaService.importFromUrl(adminContext, {
        url: "http://localtest.me:3000/secret.png",
      });
      const redirected = await MediaService.importFromUrl(adminContext, {
        url: "https://images.example/a.png",
      });

      expect(resolved.error?.reason).toBe("MEDIA_INVALID_URL");
      expect(redirected.error?.reason).toBe("MEDIA_INVALID_URL");
      const fetched = fetchMock.mock.calls
        .map(([input]) => input.href)
        .filter((url) => !url.startsWith("https://cloudflare-dns.com/"));
      expect(fetched).toEqual(["https://images.example/a.png"]);
      vi.unstubAllGlobals();
    });

    it("deletes unused media in one pass", async () => {
      const unused = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("unused-batch.png", "a"),
        }),
      );
      const used = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("used-batch.png", "b"),
        }),
      );
      const { id: postId } = await PostService.createEmptyPost(adminContext);
      await setPostContent(postId, imageDoc(used.key));

      const deleted = unwrap(await MediaService.deleteUnused(adminContext));
      expect(deleted.count).toBeGreaterThanOrEqual(1);

      const list = await MediaService.getMediaList(adminContext, {});
      expect(list.items.some((item) => item.key === unused.key)).toBe(false);
      expect(list.items.some((item) => item.key === used.key)).toBe(true);
    });
  });

  describe("Admin avatar references", () => {
    async function setAvatar(userId: string, image: string) {
      await adminContext.db
        .update(user)
        .set({ image })
        .where(eq(user.id, userId));
    }

    it("keeps media an Admin uses as their avatar", async () => {
      const avatar = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("admin-avatar.png", "a"),
        }),
      );
      await setAvatar(
        adminContext.session.user.id,
        `https://blog.example${avatar.url}`,
      );

      const stats = await MediaService.getMediaStats(adminContext);
      const unusedList = await MediaService.getMediaList(adminContext, {
        unusedOnly: true,
      });
      expect(unusedList.items.some((item) => item.key === avatar.key)).toBe(
        false,
      );

      unwrap(await MediaService.deleteUnused(adminContext));
      const list = await MediaService.getMediaList(adminContext, {});
      expect(list.items.some((item) => item.key === avatar.key)).toBe(true);
      expect(stats.unusedCount).toBe(unusedList.items.length);

      const deleted = await MediaService.deleteImage(adminContext, avatar.key);
      expect(deleted.error?.reason).toBe("MEDIA_IN_USE");
    });

    it("does not protect media a reader points their avatar at", async () => {
      const media = unwrap(
        await MediaService.upload(adminContext, {
          file: pngFile("reader-avatar.png", "r"),
        }),
      );
      const reader = createMockSession({
        user: { id: "reader-1", email: "reader@example.com", role: null },
      }).user;
      await seedUser(adminContext.db, reader);
      await setAvatar(reader.id, `https://blog.example${media.url}`);

      unwrap(await MediaService.deleteUnused(adminContext));
      const list = await MediaService.getMediaList(adminContext, {});
      expect(list.items.some((item) => item.key === media.key)).toBe(false);
    });
  });
});
