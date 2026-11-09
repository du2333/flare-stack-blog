import { toast } from "sonner";
import { m } from "@/paraglide/messages";

export interface ShareData {
  title: string;
  url: string;
}

function isAbort(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success(m.common_link_copied());
  } catch {
    toast.error(m.common_link_copy_failed());
  }
}

/**
 * Shares a link through the system's share sheet. Where the browser has none,
 * or the sheet fails, the link is copied instead. Closing the sheet does
 * nothing. Call it straight from a click: both need the click's user activation.
 */
export async function shareLink(data: ShareData) {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    navigator.canShare?.(data) !== false
  ) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      if (isAbort(error)) return;
    }
  }
  await copyLink(data.url);
}
