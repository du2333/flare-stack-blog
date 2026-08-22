import type { JSONContent } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BLOB_UPLOADING_ERROR,
  contentHasBlobUrl,
  persistableTagIds,
} from "../post-editor.model";
import type { PostEditorData, SaveStatus } from "../types";

interface UseAutoSaveOptions {
  post: PostEditorData;
  getContent: () => JSONContent | null;
  contentEpoch: number;
  onSave: (data: PostEditorData) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  setError: (error: string | null) => void;
  isDirty: boolean;
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
  pinnedAt: number | null;
  tagIds: string;
};

type SaveResult = "synced" | "dirty" | "failed" | "discarded" | "blocked";

function toMeta(post: PostEditorData): MetaSnapshot {
  return {
    title: post.title,
    summary: post.summary,
    slug: post.slug,
    publishedAt: post.publishedAt ? post.publishedAt.valueOf() : null,
    pinnedAt: post.pinnedAt ? post.pinnedAt.valueOf() : null,
    tagIds: persistableTagIds(post.tagIds)
      .sort((left, right) => left - right)
      .join(","),
  };
}

function isMetaDirty(curr: MetaSnapshot, prev: MetaSnapshot | null) {
  if (!prev) return true;
  return (
    prev.title !== curr.title ||
    prev.summary !== curr.summary ||
    prev.slug !== curr.slug ||
    prev.publishedAt !== curr.publishedAt ||
    prev.pinnedAt !== curr.pinnedAt ||
    prev.tagIds !== curr.tagIds
  );
}

export function useAutoSave({
  post,
  getContent,
  contentEpoch,
  onSave,
  debounceMs = 1500,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("SYNCED");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      return "synced";
    }

    isSaving.current = true;
    setError(null);
    assignStatus("SAVING");

    let settle!: () => void;
    const gate = new Promise<void>((resolve) => {
      settle = resolve;
    });
    inFlightRef.current = gate;

    try {
      await onSaveRef.current(payload);
      if (generationRef.current !== gen) return "discarded";
      lastSavedSnapshot.current = toMeta(payload);
      lastSavedEpochRef.current = epochAtStart;
      if (!isMounted.current) return "discarded";
      setLastSaved(new Date());
      setError(null);
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
      console.error("Auto-save failed:", err);
      assignStatus("ERROR");
      setError("AUTO_SAVE_FAILED");
      return "failed";
    } finally {
      isSaving.current = false;
      inFlightRef.current = null;
      settle();
    }
  }, [assignStatus, debounceMs, isDirtyNow]);

  const flush = useCallback(async () => {
    if (!enabledRef.current) {
      throw new Error("INSPECTING");
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
        throw new Error("AUTO_SAVE_FAILED");
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
    markSaved,
    flush,
    waitForInFlightSave,
    discardInFlightSave,
  };
}
