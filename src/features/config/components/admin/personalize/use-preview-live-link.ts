import { useEffect, useRef } from "react";
import type { FocalPoint } from "@/components/ui/focal-point";
import {
  onThemePreviewReady,
  postThemePreviewUpdate,
  type ThemePreviewLiveFields,
} from "@/features/theme/utils/theme-preview-messages";

export interface PreviewLiveValues {
  bannerFocus: FocalPoint;
  primaryHue: number;
}

/**
 * Keeps the preview in `frame` showing the banner focus and the hue that are
 * set, without reloading it: each change is posted, at most once per animation
 * frame while a control is dragged, and both are posted again every time the
 * preview says it has loaded, so nothing sent during a load is lost.
 */
export function usePreviewLiveLink(
  frame: () => Pick<Window, "postMessage"> | null | undefined,
  { bannerFocus, primaryHue }: PreviewLiveValues,
) {
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const live = useRef<ThemePreviewLiveFields>({ bannerFocus, primaryHue });
  live.current = { bannerFocus, primaryHue };
  const scheduled = useRef<number | null>(null);

  useEffect(() => {
    const send = () => {
      const target = frameRef.current();
      if (target) postThemePreviewUpdate(target, { ...live.current });
    };
    const stop = onThemePreviewReady(() => frameRef.current(), send);
    return () => {
      stop();
      if (scheduled.current !== null) cancelAnimationFrame(scheduled.current);
      scheduled.current = null;
    };
  }, []);

  useEffect(() => {
    if (scheduled.current !== null) return;
    scheduled.current = requestAnimationFrame(() => {
      scheduled.current = null;
      const target = frameRef.current();
      if (target) postThemePreviewUpdate(target, { ...live.current });
    });
  }, [bannerFocus.x, bannerFocus.y, primaryHue]);
}
