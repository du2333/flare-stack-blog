import { z } from "zod";
import type { Messages } from "@/lib/i18n";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const UploadMediaInputSchema = z.instanceof(FormData);

export function parseUploadMediaInput(formData: FormData, messages: Messages) {
  const file = formData.get("image");
  if (!(file instanceof File)) {
    throw new Error(messages.media_validation_file_required());
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(messages.media_validation_file_too_large());
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(messages.media_validation_file_invalid_type());
  }

  const rawWidth = formData.get("width");
  const rawHeight = formData.get("height");
  const parsedWidth = rawWidth ? parseInt(rawWidth.toString()) : NaN;
  const parsedHeight = rawHeight ? parseInt(rawHeight.toString()) : NaN;

  return {
    file,
    width: Number.isNaN(parsedWidth) ? undefined : parsedWidth,
    height: Number.isNaN(parsedHeight) ? undefined : parsedHeight,
  };
}

export const MediaKeyInputSchema = z.object({
  key: z.string(),
});

export function assertMediaKey(key: string, messages: Messages) {
  const trimmedKey = key.trim();
  if (trimmedKey.length === 0) {
    throw new Error(messages.media_validation_key_required());
  }

  return trimmedKey;
}

export const UpdateMediaNameInputSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
});

export const GetMediaListInputSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  unusedOnly: z.boolean().optional(),
});

export type UpdateMediaNameInput = z.infer<typeof UpdateMediaNameInputSchema>;
export type GetMediaListInput = z.infer<typeof GetMediaListInputSchema>;
