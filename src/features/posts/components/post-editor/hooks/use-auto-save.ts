import type { JSONContent } from "@tiptap/react";
import { toast } from "@/lib/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BLOB_UPLOADING_ERROR,
  CONTENT_TOO_LARGE_ERROR,
  contentHasBlobUrl,
  contentTooLargeMessage,
  EDIT_CONFLICT_ERROR,
  editConflictOf,
  isContentTooLarge,
  isSlugTaken,
  persistableTagIds,
  SLUG_TAKEN_ERROR,
} from "../post-editor.model";
import type {
  EditConflict,
  PostEditorData,
  PostEditorSave,
  SaveStatus,
} from "../types";

interface UseAutoSaveOptions {
  post: PostEditorData;
  getContent: () => JSONContent | null;
  contentEpoch: number;
  /** The post's `saveToken` as it was read. */
  saveToken: string;
  onSave: PostEditorSave;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  setError: (error: string | null) => void;
  isDirty: boolean;
  /** Set once a save was refused; autosave stays stopped until it is resolved. */
  conflict: EditConflict | null;
  getSaveToken: () => string;
  acceptSaveToken: (saveToken: string) => void;
  /** Stops autosave over a conflict found by a write other than autosave. */
  reportConflict: (conflict: EditConflict) => void;
  /** Saves the editor's content over the conflicting write and resumes. */
  overwrite: () => Promise<void>;
  markSaved: (post: PostEditorData, contentEpoch?: number) => void;
  flush: () => Promise<void>;
  waitForInFlightSave: () => Promise<void>;
  discardInFlightSave: () => void;
}

type MetaSnapshot = {
  title: string;
  summary: string;
  slug: string;
  publishedAt: number | null;
  tagIds: string;
  categoryId: number | null;
  coverMediaId: number | null;
};

type SaveResult = "synced" | "dirty" | "failed" | "discarded" | "blocked";

/** Clears the save error, except that another post still uses the slug. */
function keepSlugTaken(error: string | null) {
  return error === SLUG_TAKEN_ERROR ? error : null;
}

function toMeta(post: PostEditorData): MetaSnapshot {
  return {
    title: post.title,
    summary: post.summary,
    slug: post.slug,
    publishedAt: post.publishedAt ? post.publishedAt.valueOf() : null,
    tagIds: persistableTagIds(post.tagIds)
      .sort((left, right) => left - right)
      .join(","),
    categoryId: post.categoryId,
    coverMediaId: post.coverMediaId,
  };
}

function isMetaDirty(curr: MetaSnapshot, prev: MetaSnapshot | null) {
  if (!prev) return true;
  return (
    prev.title !== curr.title ||
    prev.summary !== curr.summary ||
    prev.slug !== curr.slug ||
    prev.publishedAt !== curr.publishedAt ||
    prev.tagIds !== curr.tagIds ||
    prev.categoryId !== curr.categoryId ||
    prev.coverMediaId !== curr.coverMediaId
  );
}

export function useAutoSave({
  post,
  getContent,
  contentEpoch,
  saveToken,
  onSave,
  debounceMs = 1500,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("SYNCED");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<EditConflict | null>(null);

  const isFirstMount = useRef(true);
  const isMounted = useRef(false);
  const isSaving = useRef(false);
  const generationRef = useRef(0);
  const latestPostRef = useRef(post);
  const contentEpochRef = useRef(contentEpoch);
  const enabledRef = useRef(enabled);
  const lastSavedSnapshot = useRef<MetaSnapshot | null>(null);
  const lastSavedEpochRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const onSaveRef = useRef(onSave);
  const getContentRef = useRef(getContent);
  const saveStatusRef = useRef(saveStatus);
  const saveTokenRef = useRef(saveToken);
  const conflictRef = useRef<EditConflict | null>(null);
  const tooLargeRef = useRef(false);

  onSaveRef.current = onSave;
  getContentRef.current = getContent;
  latestPostRef.current = post;
  contentEpochRef.current = contentEpoch;
  enabledRef.current = enabled;

  const assignStatus = useCallback((status: SaveStatus) => {
    saveStatusRef.current = status;
    if (isMounted.current) setSaveStatus(status);
  }, []);

  const isDirtyNow = useCallback(() => {
    return (
      isMetaDirty(toMeta(latestPostRef.current), lastSavedSnapshot.current) ||
      contentEpochRef.current !== lastSavedEpochRef.current
    );
  }, []);

  const clearTimer = (timerRef: {
    current: ReturnType<typeof setTimeout> | null;
  }) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const getSaveToken = useCallback(() => saveTokenRef.current, []);
  const acceptSaveToken = useCallback((token: string) => {
    saveTokenRef.current = token;
  }, []);

  const reportConflict = useCallback(
    (found: EditConflict) => {
      conflictRef.current = found;
      clearTimer(debounceTimerRef);
      clearTimer(retryTimerRef);
      assignStatus("ERROR");
      setConflict(found);
    },
    [assignStatus],
  );

  const discardInFlightSave = useCallback(() => {
    generationRef.current += 1;
    clearTimer(debounceTimerRef);
    clearTimer(retryTimerRef);
  }, []);

  const waitForInFlightSave = useCallback(async () => {
    if (inFlightRef.current) {
      await inFlightRef.current;
    }
  }, []);

  const markSaved = useCallback(
    (savedPost: PostEditorData, epoch?: number) => {
      generationRef.current += 1;
      clearTimer(debounceTimerRef);
      clearTimer(retryTimerRef);
      latestPostRef.current = savedPost;
      lastSavedSnapshot.current = toMeta(savedPost);
      lastSavedEpochRef.current = epoch ?? contentEpochRef.current;
      setError(null);
      assignStatus("SYNCED");
      setLastSaved(new Date());
    },
    [assignStatus],
  );

  const attemptSave = useCallback(async (): Promise<SaveResult> => {
    if (conflictRef.current) return "failed";
    if (isSaving.current) {
      if (inFlightRef.current) {
        await inFlightRef.current;
      }
      if (saveStatusRef.current === "ERROR") return "failed";
      return isDirtyNow() ? "dirty" : "synced";
    }

    const gen = generationRef.current;
    const content = getContentRef.current();
    if (contentHasBlobUrl(content)) {
      assignStatus("PENDING");
      return "blocked";
    }

    const latestPost = latestPostRef.current;
    const epochAtStart = contentEpochRef.current;
    const payload: PostEditorData = {
      ...latestPost,
      contentJson: content,
      tagIds: persistableTagIds(latestPost.tagIds),
    };

    if (
      !isMetaDirty(toMeta(payload), lastSavedSnapshot.current) &&
      epochAtStart === lastSavedEpochRef.current
    ) {
      assignStatus("SYNCED");
      setError(keepSlugTaken);
      return "synced";
    }

    isSaving.current = true;
    tooLargeRef.current = false;
    setError(keepSlugTaken);
    assignStatus("SAVING");

    let settle!: () => void;
    const gate = new Promise<void>((resolve) => {
      settle = resolve;
    });
    inFlightRef.current = gate;

    try {
      const outcome = await onSaveRef.current(
        payload,
        saveTokenRef.current,
        acceptSaveToken,
      );
      if (generationRef.current !== gen) return "discarded";
      lastSavedSnapshot.current = toMeta(payload);
      lastSavedEpochRef.current = epochAtStart;
      if (!isMounted.current) return "discarded";
      setLastSaved(new Date());
      // The rest of the post was saved without a slug another post uses; the
      // slug field keeps saying so until a save takes a slug again.
      setError(outcome?.slugTaken ? SLUG_TAKEN_ERROR : null);
      if (isDirtyNow()) {
        assignStatus("PENDING");
        if (enabledRef.current) {
          clearTimer(retryTimerRef);
          retryTimerRef.current = setTimeout(() => {
            if (!enabledRef.current || !isMounted.current) return;
            void attemptSave();
          }, debounceMs);
        }
        return "dirty";
      }
      assignStatus("SYNCED");
      return "synced";
    } catch (err) {
      if (generationRef.current !== gen) return "discarded";
      const found = editConflictOf(err);
      if (found) {
        reportConflict(found);
        return "failed";
      }
      console.error("Auto-save failed:", err);
      assignStatus("ERROR");
      if (isContentTooLarge(err)) {
        // Nothing was written; saying why is all there is to do until the
        // Admin shortens the post.
        tooLargeRef.current = true;
        toast.error(contentTooLargeMessage(err));
        setError(CONTENT_TOO_LARGE_ERROR);
        return "failed";
      }
      setError(isSlugTaken(err) ? SLUG_TAKEN_ERROR : "AUTO_SAVE_FAILED");
      return "failed";
    } finally {
      isSaving.current = false;
      inFlightRef.current = null;
      settle();
    }
  }, [acceptSaveToken, assignStatus, debounceMs, isDirtyNow, reportConflict]);

  const overwrite = useCallback(async () => {
    const found = conflictRef.current;
    if (!found) return;
    saveTokenRef.current = found.saveToken;
    conflictRef.current = null;
    setConflict(null);
    // The editor holds what the Admin wants stored, even if it matches the
    // last save, so nothing counts as already saved.
    lastSavedSnapshot.current = null;
    await attemptSave();
  }, [attemptSave]);

  const flush = useCallback(async () => {
    if (!enabledRef.current) {
      throw new Error("INSPECTING");
    }
    if (conflictRef.current) {
      throw new Error(EDIT_CONFLICT_ERROR);
    }

    clearTimer(debounceTimerRef);
    clearTimer(retryTimerRef);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await waitForInFlightSave();
      if (contentHasBlobUrl(getContentRef.current())) {
        assignStatus("PENDING");
        throw new Error(BLOB_UPLOADING_ERROR);
      }
      if (!isDirtyNow() && saveStatusRef.current !== "ERROR") {
        return;
      }
      const result = await attemptSave();
      if (result === "blocked") {
        throw new Error(BLOB_UPLOADING_ERROR);
      }
      if (result === "failed") {
        throw new Error(
          conflictRef.current
            ? EDIT_CONFLICT_ERROR
            : tooLargeRef.current
              ? CONTENT_TOO_LARGE_ERROR
              : "AUTO_SAVE_FAILED",
        );
      }
      if (result === "synced") {
        return;
      }
    }

    if (isDirtyNow() || saveStatusRef.current === "ERROR") {
      throw new Error("AUTO_SAVE_FAILED");
    }
  }, [assignStatus, attemptSave, isDirtyNow, waitForInFlightSave]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearTimer(debounceTimerRef);
      clearTimer(retryTimerRef);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimer(debounceTimerRef);
      clearTimer(retryTimerRef);
      return;
    }

    if (isFirstMount.current) {
      isFirstMount.current = false;
      lastSavedSnapshot.current = toMeta(post);
      lastSavedEpochRef.current = contentEpoch;
      return;
    }

    if (conflictRef.current) return;

    if (!isDirtyNow()) {
      if (!isSaving.current) assignStatus("SYNCED");
      return;
    }

    assignStatus("PENDING");
    clearTimer(debounceTimerRef);
    clearTimer(retryTimerRef);
    debounceTimerRef.current = setTimeout(() => {
      void attemptSave();
    }, debounceMs);

    return () => {
      clearTimer(debounceTimerRef);
    };
  }, [
    post,
    contentEpoch,
    debounceMs,
    enabled,
    attemptSave,
    assignStatus,
    isDirtyNow,
  ]);

  return {
    saveStatus,
    lastSaved,
    error,
    setError,
    isDirty: isDirtyNow(),
    conflict,
    getSaveToken,
    acceptSaveToken,
    reportConflict,
    overwrite,
    markSaved,
    flush,
    waitForInFlightSave,
    discardInFlightSave,
  };
}
