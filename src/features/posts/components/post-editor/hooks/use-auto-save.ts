import { useEffect, useRef, useState } from "react";
import type { PostEditorData, SaveStatus } from "../types";

interface UseAutoSaveOptions {
  post: PostEditorData;
  onSave: (data: PostEditorData) => Promise<void>;
  debounceMs?: number;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  setError: (error: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  isDirty: boolean;
  markSaved: (post: PostEditorData) => void;
}

export function useAutoSave({
  post,
  onSave,
  debounceMs = 1500,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("SYNCED");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFirstMount = useRef(true);
  const isMounted = useRef(false);
  const isSaving = useRef(false);
  const latestPostRef = useRef(post);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track last-saved snapshot (shallow)
  const lastSavedSnapshot = useRef<{
    title: string;
    summary: string;
    slug: string;
    status: string;
    readTimeInMinutes: number;
    publishedAt: number | null;
    pinnedAt: number | null;
    tagIds: string; // Serialize for easy comparison
    contentRef: PostEditorData["contentJson"];
  } | null>(null);
  // Store onSave in ref to avoid effect re-running when onSave reference changes
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const toComparable = (p: PostEditorData) => ({
    title: p.title,
    summary: p.summary,
    slug: p.slug,
    status: p.status,
    readTimeInMinutes: p.readTimeInMinutes,
    publishedAt: p.publishedAt ? p.publishedAt.valueOf() : null,
    pinnedAt: p.pinnedAt ? p.pinnedAt.valueOf() : null,
    tagIds: [...p.tagIds].sort().join(","),
    contentRef: p.contentJson,
  });

  const isDirty = (curr: ReturnType<typeof toComparable>) => {
    const prev = lastSavedSnapshot.current;
    if (!prev) return true;
    return (
      prev.title !== curr.title ||
      prev.summary !== curr.summary ||
      prev.slug !== curr.slug ||
      prev.status !== curr.status ||
      prev.readTimeInMinutes !== curr.readTimeInMinutes ||
      prev.publishedAt !== curr.publishedAt ||
      prev.pinnedAt !== curr.pinnedAt ||
      prev.tagIds !== curr.tagIds ||
      prev.contentRef !== curr.contentRef
    );
  };

  const markSaved = (savedPost: PostEditorData) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    latestPostRef.current = savedPost;
    lastSavedSnapshot.current = toComparable(savedPost);
    setError(null);
    setSaveStatus("SYNCED");
    setLastSaved(new Date());
  };

  // Track mount / unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  // Auto-save effect - always enabled
  useEffect(() => {
    latestPostRef.current = post;
    const current = toComparable(post);

    if (isFirstMount.current) {
      isFirstMount.current = false;
      lastSavedSnapshot.current = current;
      return;
    }

    if (!isDirty(current)) {
      setSaveStatus("SYNCED");
      return;
    }

    setSaveStatus("SAVING");

    const attemptSave = async () => {
      if (isSaving.current) return;
      isSaving.current = true;

      try {
        setError(null);
        const latestPost = latestPostRef.current;
        await onSaveRef.current(latestPost);
        const latestComparable = toComparable(latestPost);
        lastSavedSnapshot.current = latestComparable;
        if (!isMounted.current) return;
        setLastSaved(new Date());

        // After saving, if new changes arrived during the request, schedule another save (debounced)
        const stillDirty = isDirty(toComparable(latestPostRef.current));
        if (stillDirty) {
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }
          retryTimerRef.current = setTimeout(() => {
            if (!isMounted.current) return;
            // respect debounce and avoid overlapping saves
            attemptSave();
          }, debounceMs);
          setSaveStatus("SAVING");
        } else {
          setSaveStatus("SYNCED");
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("ERROR");
        setError("AUTO_SAVE_FAILED");
      } finally {
        isSaving.current = false;
      }
    };

    const timer = setTimeout(() => {
      void attemptSave();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [post, debounceMs]);

  return {
    saveStatus,
    lastSaved,
    error,
    setError,
    setSaveStatus,
    isDirty: isDirty(toComparable(post)),
    markSaved,
  };
}
