import { useState } from "react";
import { toast } from "sonner";
import { extractImageKey } from "@/features/media/utils/media.utils";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import type { MediaAsset } from "../types";

/**
 * Imports an image URL into the media library. A URL of a library image
 * already in `known` resolves to it without importing again. Resolves with
 * `null` (after a toast) when the import fails.
 */
export function useMediaUrlImport(known: ReadonlyArray<MediaAsset>) {
  const [importing, setImporting] = useState(false);

  const importUrl = async (url: string): Promise<MediaAsset | null> => {
    const trimmed = url.trim();
    if (!trimmed) return null;
    const existingKey = extractImageKey(trimmed);
    const existing = existingKey
      ? known.find((item) => item.key === existingKey)
      : undefined;
    if (existing) return existing;
    setImporting(true);
    try {
      const media = await orpcClient.media.importFromUrl({ url: trimmed });
      return {
        ...media,
        postCount: 0,
        revisionOnlyPostCount: 0,
        momentCount: 0,
        isCover: false,
      };
    } catch {
      toast.error(m.media_import_fail());
      return null;
    } finally {
      setImporting(false);
    }
  };

  return { importUrl, importing };
}
