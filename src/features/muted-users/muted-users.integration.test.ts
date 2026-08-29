import {
  createAdminTestContext,
  createAuthTestContext,
  createMockSession,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import * as CommentService from "@/features/comments/comments.service";
import * as MutedUserService from "@/features/muted-users/service/muted-users.service";
import * as PostService from "@/features/posts/services/posts.service";
import { unwrap } from "@/lib/errors";

describe("Muted Users", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;
  let userContext: ReturnType<typeof createAuthTestContext>;
  let postId: number;

  beforeEach(async () => {
    adminContext = createAdminTestContext();
    await seedUser(adminContext.db, adminContext.session.user);

    const userSession = createMockSession({
      user: {
        id: "user-1",
        name: "Test User",
        email: "user@example.com",
        role: null,
      },
    });
    userContext = createAuthTestContext({ session: userSession });
    await seedUser(userContext.db, userSession.user);

    const { id } = await PostService.createEmptyPost(adminContext);
    unwrap(
      await PostService.updatePost(adminContext, {
        id,
        data: {
          title: "Test Post",
          slug: `mute-post-${Date.now()}`,
        },
      }),
    );
    unwrap(await PostService.publishPost(adminContext, { id }));
    postId = id;
  });

  it("prevents a muted user from creating a comment", async () => {
    unwrap(
      await MutedUserService.muteUser(adminContext, {
        userId: userContext.session.user.id,
      }),
    );

    const result = await CommentService.createComment(userContext, {
      postId,
      content: "Should fail",
    });
    expect(result.error?.reason).toBe("USER_MUTED");
  });

  it("lets a muted user comment again after unmute", async () => {
    unwrap(
      await MutedUserService.muteUser(adminContext, {
        userId: userContext.session.user.id,
      }),
    );
    unwrap(
      await MutedUserService.unmuteUser(adminContext, {
        userId: userContext.session.user.id,
      }),
    );

    const comment = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Back again",
      }),
    );
    expect(comment.status).toBe("published");
  });

  it("does not mute an admin", async () => {
    const result = await MutedUserService.muteUser(adminContext, {
      userId: adminContext.session.user.id,
    });
    expect(result.error?.reason).toBe("CANNOT_MUTE_ADMIN");
  });

  it("lists only currently muted users", async () => {
    unwrap(
      await MutedUserService.muteUser(adminContext, {
        userId: userContext.session.user.id,
      }),
    );

    const listed = await MutedUserService.listMutedUsers(adminContext);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(userContext.session.user.id);

    unwrap(
      await MutedUserService.unmuteUser(adminContext, {
        userId: userContext.session.user.id,
      }),
    );
    expect(await MutedUserService.listMutedUsers(adminContext)).toHaveLength(0);
  });

  it("returns USER_NOT_FOUND for an unknown user", async () => {
    const result = await MutedUserService.muteUser(adminContext, {
      userId: "missing",
    });
    expect(result.error?.reason).toBe("USER_NOT_FOUND");
  });

  it("marks the comment viewer as muted", async () => {
    unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Before mute",
      }),
    );
    unwrap(
      await MutedUserService.muteUser(adminContext, {
        userId: userContext.session.user.id,
      }),
    );

    const asUser = await CommentService.getRootCommentsByPostId(userContext, {
      postId,
    });
    expect(asUser.viewerMuted).toBe(true);

    const asAdmin = await CommentService.getRootCommentsByPostId(adminContext, {
      postId,
    });
    expect(asAdmin.viewerMuted).toBe(false);
  });

  it("keeps existing comments after mute", async () => {
    const comment = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Stays",
      }),
    );
    unwrap(
      await MutedUserService.muteUser(adminContext, {
        userId: userContext.session.user.id,
      }),
    );

    const listed = await CommentService.getRootCommentsByPostId(adminContext, {
      postId,
    });
    expect(listed.items.some((item) => item.id === comment.id)).toBe(true);
    expect(listed.items[0]?.user?.mutedAt).toBeTruthy();
  });
});
