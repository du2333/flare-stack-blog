import { useRouteContext } from "@tanstack/react-router";
import { useEffect, useSyncExternalStore } from "react";
import type { FocalPoint } from "@/components/ui/focal-point";
import type {
  PreviewWindow,
  ThemePreviewLiveFields,
} from "./theme-preview-messages";

/**
 * The fields the embedding Admin page has changed in place since the preview
 * loaded (`theme-preview-messages.ts`). Empty on every other page, where
 * nothing writes it, so a page renders exactly from its Site Config.
 */
const EMPTY: ThemePreviewLiveFields = {};
let live = EMPTY;
const subscribers = new Set<() => void>();

function notify() {
  for (const subscriber of subscribers) subscriber();
}

export function updateThemePreviewLive(fields: ThemePreviewLiveFields) {
  live = { ...live, ...fields };
  notify();
}

export function clearThemePreviewLive() {
  if (live === EMPTY) return;
  live = EMPTY;
  notify();
}

function subscribe(subscriber: () => void) {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function useThemePreviewLive<K extends keyof ThemePreviewLiveFields>(
  field: K,
): ThemePreviewLiveFields[K] {
  return useSyncExternalStore(
    subscribe,
    () => live[field],
    () => undefined,
  );
}

/** The banner focus to render: the one moved in place, else Site Config's. */
export function useBannerFocus(): FocalPoint {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  return useThemePreviewLive("bannerFocus") ?? siteConfig.bannerFocus;
}

/**
 * Listens for in-place updates while `previewing`, and only then: the
 * listener is loaded on demand, so a visitor's page carries none of it. What
 * was moved in place is forgotten when the preview ends.
 */
export function useThemePreviewMessages(
  previewing: boolean,
  page?: PreviewWindow,
) {
  useEffect(() => {
    if (!previewing) return;
    let stop: (() => void) | undefined;
    let ended = false;
    void import("./theme-preview-messages").then(
      ({ listenForThemePreviewUpdates }) => {
        if (ended) return;
        stop = listenForThemePreviewUpdates(updateThemePreviewLive, page);
      },
    );
    return () => {
      ended = true;
      stop?.();
      clearThemePreviewLive();
    };
  }, [previewing, page]);
}
