import { z } from "zod";
import { MOMENT_IMAGES_MAX } from "@/features/moments/utils/moment-rules";
import type { MomentDraft } from "./moment-draft";
import { draftIsEmpty } from "./moment-draft";

/** Where the unsent text and attachments of a new Moment are kept. */
export const MOMENT_DRAFT_STORAGE_KEY = "moment-draft";

const nullableInt = z.number().int().nullable();

const StoredDraftSchema = z
  .object({
    text: z.string(),
    images: z
      .array(
        z.object({
          key: z.string().min(1),
          url: z.string(),
          width: nullableInt,
          height: nullableInt,
        }),
      )
      .max(MOMENT_IMAGES_MAX),
    video: z
      .discriminatedUnion("kind", [
        z.object({
          kind: z.literal("provider"),
          source: z.object({
            provider: z.enum(["bilibili", "youtube"]),
            videoId: z.string().min(1),
            page: nullableInt,
            start: nullableInt,
          }),
          meta: z.object({
            title: z.string().nullable(),
            cover: z.string().nullable(),
            duration: z.number().nullable(),
          }),
        }),
        z.object({
          kind: z.literal("direct"),
          video: z.object({
            src: z.string().min(1),
            pageUrl: z.string().nullable(),
            title: z.string().nullable(),
            cover: z.string().nullable(),
            duration: z.number().nullable(),
          }),
        }),
      ])
      .nullable(),
  })
  .refine((draft) => draft.images.length === 0 || draft.video === null);

/** The browser's storage, or `null` where it is missing or refuses access. */
function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The draft left behind by the last unsent Moment, or `null` when there is
 * none or what is stored cannot be read. The images are Media paths and the
 * video its data, never files.
 */
export function loadStoredDraft(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): MomentDraft | null {
  try {
    const raw = storage?.getItem(MOMENT_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = StoredDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || draftIsEmpty(parsed.data)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Keeps the draft for the next visit; an empty one removes what was kept. */
export function saveStoredDraft(
  draft: MomentDraft,
  storage: Pick<Storage, "setItem" | "removeItem"> | null = browserStorage(),
) {
  try {
    if (draftIsEmpty(draft)) {
      storage?.removeItem(MOMENT_DRAFT_STORAGE_KEY);
    } else {
      storage?.setItem(MOMENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
  } catch {
    // Storage that is full or blocked only costs the Admin the restore.
  }
}

/** Forgets the draft, once its Moment is posted. */
export function clearStoredDraft(
  storage: Pick<Storage, "removeItem"> | null = browserStorage(),
) {
  try {
    storage?.removeItem(MOMENT_DRAFT_STORAGE_KEY);
  } catch {
    // Nothing kept, nothing to forget.
  }
}
