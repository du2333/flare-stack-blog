import { z } from "zod";
import { ms } from "@/lib/duration";
import { ApplicationReleaseVersionSchema } from "./version.schema";

export const UPDATE_NOTICE_STORAGE_KEY = "version_update_notice";

type NoticeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const UpdateNoticeStateSchema = z.object({
  version: ApplicationReleaseVersionSchema,
  lastShownAt: z.number().finite().nonnegative(),
  ignored: z.boolean(),
});

type UpdateNoticeState = z.infer<typeof UpdateNoticeStateSchema>;

export function shouldShowUpdateNotice(
  storage: NoticeStorage,
  version: string,
  now = Date.now(),
) {
  const state = readState(storage);
  if (!state || state.version !== version) return true;
  if (state.ignored) return false;
  return now - state.lastShownAt > ms("1d");
}

export function recordUpdateNoticeShown(
  storage: NoticeStorage,
  version: string,
  now = Date.now(),
) {
  const state = readState(storage);
  writeState(storage, {
    version: ApplicationReleaseVersionSchema.parse(version),
    lastShownAt: now,
    ignored: state?.version === version ? state.ignored : false,
  });
}

export function ignoreUpdateNotice(storage: NoticeStorage, version: string) {
  const state = readState(storage);
  if (!state || state.version !== version) return;
  writeState(storage, {
    version: ApplicationReleaseVersionSchema.parse(version),
    lastShownAt: state.lastShownAt,
    ignored: true,
  });
}

function readState(storage: NoticeStorage): UpdateNoticeState | null {
  try {
    const raw = storage.getItem(UPDATE_NOTICE_STORAGE_KEY);
    if (!raw) return null;
    const result = UpdateNoticeStateSchema.safeParse(JSON.parse(raw));
    if (result.success) return result.data;
    storage.removeItem(UPDATE_NOTICE_STORAGE_KEY);
  } catch {
    try {
      storage.removeItem(UPDATE_NOTICE_STORAGE_KEY);
    } catch {
      // Storage may be unavailable. Treat it as empty state.
    }
  }
  return null;
}

function writeState(storage: NoticeStorage, state: UpdateNoticeState) {
  try {
    storage.setItem(UPDATE_NOTICE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A notice must not break the Admin UI when storage is unavailable.
  }
}
