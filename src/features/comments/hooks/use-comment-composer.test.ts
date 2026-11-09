// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { CreateCommentInput } from "../comments.schema";
import { useCommentComposer } from "./use-comment-composer";

function options() {
  return {
    target: { type: "post" as const, id: 1 },
    userId: "reader",
    isCreating: false,
    createComment: vi.fn(async (_input: CreateCommentInput) => ({ id: 50 })),
    challenge: { requireReady: vi.fn(), reset: vi.fn() },
    onCreated: vi.fn(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it.each(["root", "reply"] as const)(
  "keeps the %s draft untouched when verification is not ready",
  async (kind) => {
    const input = options();
    const notReady = new Error("TURNSTILE_PENDING");
    input.challenge.requireReady.mockImplementation(() => {
      throw notReady;
    });
    const { result } = renderHook(() => useCommentComposer(input));
    if (kind === "root") act(() => result.current.startRoot());
    else
      act(() =>
        result.current.startReply({
          rootId: 10,
          commentId: 11,
          userName: "Alice",
        }),
      );
    act(() => result.current[kind].onChange("Keep until verified"));
    await act(async () => {
      await expect(
        result.current[kind].onSubmit("Keep until verified"),
      ).rejects.toBe(notReady);
    });
    expect(result.current[kind].value).toBe("Keep until verified");
    expect(input.createComment).not.toHaveBeenCalled();
    expect(input.challenge.reset).not.toHaveBeenCalled();
    expect(input.onCreated).not.toHaveBeenCalled();
  },
);

it("keeps a failed root draft for retry, then clears only the root and reveals its new Thread", async () => {
  const input = options();
  const failure = new Error("Temporary failure");
  input.createComment
    .mockRejectedValueOnce(failure)
    .mockResolvedValueOnce({ id: 50 });
  const { result } = renderHook(() => useCommentComposer(input));
  const alice = { rootId: 10, commentId: 11, userName: "Alice" };
  act(() => result.current.startReply(alice));
  act(() => result.current.reply.onChange("Keep reply"));
  act(() => result.current.startRoot());
  act(() => result.current.root.onChange("Root draft"));
  await act(async () => {
    await expect(result.current.root.onSubmit("Root draft")).rejects.toBe(
      failure,
    );
  });
  expect(result.current.root.isOpen).toBe(true);
  expect(result.current.root.value).toBe("Root draft");
  expect(input.onCreated).not.toHaveBeenCalled();
  expect(input.challenge.reset).toHaveBeenCalledOnce();

  await act(async () => {
    await result.current.root.onSubmit("Root draft");
  });
  expect(input.createComment).toHaveBeenLastCalledWith({
    postId: 1,
    content: "Root draft",
  });
  expect(input.onCreated).toHaveBeenCalledExactlyOnceWith({
    rootId: 50,
    commentId: 50,
  });
  expect(result.current.root.isOpen).toBe(false);
  expect(result.current.root.value).toBe("");
  expect(input.challenge.reset).toHaveBeenCalledTimes(2);
  act(() => result.current.startReply(alice));
  expect(result.current.reply.value).toBe("Keep reply");
});

it("retains a failed Reply draft and resets its challenge without announcing a new Comment", async () => {
  const input = options();
  const failure = new Error("Network unavailable");
  input.createComment.mockRejectedValue(failure);
  const { result } = renderHook(() => useCommentComposer(input));
  const alice = { rootId: 10, commentId: 11, userName: "Alice" };
  act(() => result.current.startReply(alice));
  act(() => result.current.reply.onChange("Retry this reply"));
  await act(async () => {
    await expect(
      result.current.reply.onSubmit("Retry this reply"),
    ).rejects.toBe(failure);
  });
  expect(result.current.reply.value).toBe("Retry this reply");
  expect(result.current.reply.target).toEqual(alice);
  expect(input.onCreated).not.toHaveBeenCalled();
  expect(input.challenge.reset).toHaveBeenCalledOnce();
});

it("finishes a Reply only after creation completes and clears only that target's draft", async () => {
  const input = options();
  const pending = deferred<{ id: number }>();
  input.createComment.mockReturnValue(pending.promise);
  const { result } = renderHook(() => useCommentComposer(input));
  const alice = { rootId: 10, commentId: 11, userName: "Alice" };
  const bob = { rootId: 10, commentId: 12, userName: "Bob" };
  const comment = document.createElement("div");
  comment.id = "comment-11";
  const trigger = document.createElement("button");
  trigger.className = "comment-reply-button";
  comment.appendChild(trigger);
  document.body.appendChild(comment);
  act(() => result.current.startRoot());
  act(() => result.current.root.onChange("Keep root"));
  act(() => result.current.startReply(bob));
  act(() => result.current.reply.onChange("Keep Bob"));
  act(() => result.current.startReply(alice));
  act(() => result.current.reply.onChange("Send Alice"));

  const submitted = result.current.reply.onSubmit("Send Alice");
  expect(result.current.reply.value).toBe("Send Alice");
  expect(result.current.reply.target).toEqual(alice);
  expect(input.onCreated).not.toHaveBeenCalled();
  expect(input.challenge.reset).not.toHaveBeenCalled();
  await act(async () => {
    pending.resolve({ id: 50 });
    await submitted;
  });
  expect(input.createComment).toHaveBeenCalledWith({
    postId: 1,
    rootId: 10,
    replyToCommentId: 11,
    content: "Send Alice",
  });
  expect(input.onCreated).toHaveBeenCalledWith({ rootId: 10, commentId: 50 });
  expect(input.challenge.reset).toHaveBeenCalledOnce();
  expect(result.current.reply.target).toBeNull();
  expect(document.activeElement).toBe(trigger);
  act(() => result.current.startReply(alice));
  expect(result.current.reply.value).toBe("");
  act(() => result.current.startReply(bob));
  expect(result.current.reply.value).toBe("Keep Bob");
  expect(result.current.root.value).toBe("Keep root");
});

it("does not switch the editing target while a creation is pending", () => {
  const input = options();
  const { result, rerender } = renderHook(
    ({ isCreating }) => useCommentComposer({ ...input, isCreating }),
    { initialProps: { isCreating: false } },
  );
  const alice = { rootId: 10, commentId: 11, userName: "Alice" };
  const bob = { rootId: 10, commentId: 12, userName: "Bob" };
  act(() => result.current.startReply(alice));
  act(() => result.current.reply.onChange("In flight"));
  rerender({ isCreating: true });
  act(() => result.current.startReply(bob));
  act(() => result.current.startRoot());
  expect(result.current.reply.target).toEqual(alice);
  expect(result.current.reply.value).toBe("In flight");
  expect(result.current.root.isOpen).toBe(false);
  rerender({ isCreating: false });
  act(() => result.current.startReply(bob));
  expect(result.current.reply.target).toEqual(bob);
});

it("keeps cancelled drafts and returns focus to each composer entry", () => {
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  const rootTrigger = document.createElement("button");
  rootTrigger.className = "comment-new-trigger";
  const comment = document.createElement("div");
  comment.id = "comment-11";
  const replyTrigger = document.createElement("button");
  replyTrigger.className = "comment-reply-button";
  comment.appendChild(replyTrigger);
  const inputElement = document.createElement("textarea");
  document.body.appendChild(rootTrigger);
  document.body.appendChild(comment);
  document.body.appendChild(inputElement);
  const input = options();
  const { result } = renderHook(() => useCommentComposer(input));

  act(() => result.current.startRoot());
  act(() => result.current.root.onChange("Root draft"));
  inputElement.focus();
  act(() => result.current.root.onCancel());
  expect(result.current.root.isOpen).toBe(false);
  expect(result.current.root.value).toBe("Root draft");
  expect(document.activeElement).toBe(inputElement);
  act(() => frame?.(0));
  expect(document.activeElement).toBe(rootTrigger);

  act(() =>
    result.current.startReply({ rootId: 10, commentId: 11, userName: "Alice" }),
  );
  act(() => result.current.reply.onChange("Reply draft"));
  inputElement.focus();
  act(() => result.current.reply.onCancel());
  expect(result.current.reply.target).toBeNull();
  expect(document.activeElement).toBe(replyTrigger);
  act(() =>
    result.current.startReply({ rootId: 10, commentId: 11, userName: "Alice" }),
  );
  expect(result.current.reply.value).toBe("Reply draft");
});

it("resets the composer only when its Post or User changes", () => {
  const input = options();
  const { result, rerender } = renderHook(
    ({ postId, userId }) =>
      useCommentComposer({
        ...input,
        target: { type: "post", id: postId },
        userId,
      }),
    { initialProps: { postId: 1, userId: "reader" } },
  );
  act(() => result.current.startRoot());
  act(() => result.current.root.onChange("Root draft"));
  act(() =>
    result.current.startReply({ rootId: 10, commentId: 11, userName: "Alice" }),
  );
  act(() => result.current.reply.onChange("Reply draft"));

  rerender({ postId: 1, userId: "reader" });
  expect(result.current.reply.value).toBe("Reply draft");
  expect(result.current.root.value).toBe("Root draft");

  rerender({ postId: 2, userId: "reader" });
  expect(result.current.reply.target).toBeNull();
  expect(result.current.root.isOpen).toBe(false);
  expect(result.current.root.value).toBe("");
  act(() => result.current.startRoot());
  act(() => result.current.root.onChange("Another Post's draft"));
  rerender({ postId: 2, userId: "another-reader" });
  expect(result.current.root.isOpen).toBe(false);
  expect(result.current.root.value).toBe("");
});

it("keeps separate root and reply drafts while switching targets in the same Thread", () => {
  const input = options();
  const { result } = renderHook(() => useCommentComposer(input));
  const alice = { rootId: 10, commentId: 11, userName: "Alice" };
  const bob = { rootId: 10, commentId: 12, userName: "Bob" };

  act(() => result.current.startRoot());
  act(() => result.current.root.onChange("Root draft"));
  act(() => result.current.startReply(alice));
  expect(result.current.root.isOpen).toBe(false);
  act(() => result.current.reply.onChange("Reply to Alice"));
  act(() => result.current.startReply(bob));
  expect(result.current.reply.value).toBe("");
  act(() => result.current.reply.onChange("Reply to Bob"));
  act(() => result.current.startReply(alice));
  expect(result.current.reply.value).toBe("Reply to Alice");
  act(() => result.current.startRoot());
  expect(result.current.reply.target).toBeNull();
  expect(result.current.root.isOpen).toBe(true);
  expect(result.current.root.value).toBe("Root draft");
  act(() => result.current.startReply(bob));
  expect(result.current.reply.value).toBe("Reply to Bob");
});

it("creates a Post's Comments with its postId and a Moment's with its momentId", async () => {
  const post = options();
  const { result: onPost } = renderHook(() => useCommentComposer(post));
  act(() => onPost.current.startRoot());
  await act(async () => onPost.current.root.onSubmit("On a Post"));
  expect(post.createComment).toHaveBeenCalledWith({
    postId: 1,
    content: "On a Post",
  });

  const moment = { ...options(), target: { type: "moment" as const, id: 7 } };
  const { result: onMoment } = renderHook(() => useCommentComposer(moment));
  act(() => onMoment.current.startRoot());
  await act(async () => onMoment.current.root.onSubmit("On a Moment"));
  expect(moment.createComment).toHaveBeenCalledWith({
    momentId: 7,
    content: "On a Moment",
  });
  act(() =>
    onMoment.current.startReply({
      rootId: 10,
      commentId: 11,
      userName: "Alice",
    }),
  );
  await act(async () => onMoment.current.reply.onSubmit("Reply on a Moment"));
  expect(moment.createComment).toHaveBeenLastCalledWith({
    momentId: 7,
    content: "Reply on a Moment",
    rootId: 10,
    replyToCommentId: 11,
  });
});

it("resets the composer when the same id belongs to the other kind of target", () => {
  const input = options();
  const { result, rerender } = renderHook(
    ({ type }: { type: "post" | "moment" }) =>
      useCommentComposer({ ...input, target: { type, id: 1 } }),
    { initialProps: { type: "post" } },
  );
  act(() => result.current.startRoot());
  act(() => result.current.root.onChange("A Post's draft"));
  rerender({ type: "moment" });
  expect(result.current.root.isOpen).toBe(false);
  expect(result.current.root.value).toBe("");
});
