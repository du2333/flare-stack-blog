import { z } from "zod";

// ─── 文件类别 ─────────────────────────────────────────

export type MediaCategory = "image" | "guitar-pro" | "video" | "audio";

// ─── 按类型的大小限制 ─────────────────────────────────

/** @deprecated 兼容旧代码 — 请使用 getMaxFileSize */
export const MAX_FILE_SIZE = 30 * 1024 * 1024;

export const MAX_FILE_SIZE_BY_CATEGORY: Record<MediaCategory, number> = {
  image: 30 * 1024 * 1024,       // 30 MB
  "guitar-pro": 50 * 1024 * 1024, // 50 MB
  video: 512 * 1024 * 1024,       // 512 MB
  audio: 50 * 1024 * 1024,        // 50 MB
};

export function getMaxFileSize(category: MediaCategory): number {
  return MAX_FILE_SIZE_BY_CATEGORY[category];
}

export function formatMaxSize(category: MediaCategory): string {
  const bytes = MAX_FILE_SIZE_BY_CATEGORY[category];
  if (bytes >= 1024 * 1024 * 1024) return `${bytes / (1024 * 1024 * 1024)}GB`;
  return `${bytes / (1024 * 1024)}MB`;
}

// ─── MIME 类型 ─────────────────────────────────────────

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

/** Guitar Pro 吉他谱文件 MIME 类型 */
export const ACCEPTED_GUITAR_PRO_TYPES = [
  "application/x-guitar-pro",
  "application/octet-stream",
];

/** Guitar Pro 文件扩展名 */
export const GUITAR_PRO_EXTENSIONS = [
  ".gp3",
  ".gp4",
  ".gp5",
  ".gpx",
  ".gp",
];

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

export const VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
];

export const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
  "audio/webm",
];

export const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".m4a",
  ".weba",
];

export const ACCEPTED_FILE_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_GUITAR_PRO_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
  ...ACCEPTED_AUDIO_TYPES,
];

// ─── 文件类别检测 ──────────────────────────────────────

function isGuitarProFileByName(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return GUITAR_PRO_EXTENSIONS.includes(ext);
}

function isVideoFileByName(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return VIDEO_EXTENSIONS.includes(ext);
}

function isAudioFileByName(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return AUDIO_EXTENSIONS.includes(ext);
}

/** 根据 File 对象检测媒体类别 */
export function detectMediaCategory(file: File): MediaCategory {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return "image";
  if (isGuitarProFileByName(file)) return "guitar-pro";
  if (ACCEPTED_VIDEO_TYPES.includes(file.type) || isVideoFileByName(file)) return "video";
  if (ACCEPTED_AUDIO_TYPES.includes(file.type) || isAudioFileByName(file)) return "audio";
  // 未知类型回退
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

/** 检查文件是否为支持的类型 */
export function isSupportedFile(file: File): boolean {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return true;
  if (isGuitarProFileByName(file)) return true;
  if (ACCEPTED_VIDEO_TYPES.includes(file.type) || isVideoFileByName(file)) return true;
  if (ACCEPTED_AUDIO_TYPES.includes(file.type) || isAudioFileByName(file)) return true;
  return false;
}

/** 根据文件类别返回人类可读的支持格式列表 */
export function getSupportedFormatsText(): string {
  return "图片 (JPG/PNG/WebP/GIF ≤30MB) · 吉他谱 (GP3/4/5/GPX/GP ≤50MB) · 视频 (MP4/WebM/MOV ≤512MB) · 音频 (MP3/WAV/OGG/FLAC ≤50MB)";
}

// ─── Zod Schemas ──────────────────────────────────────

export const UploadMediaInputSchema = z
  .instanceof(FormData)
  .transform((formData) => {
    const file = formData.get("image");
    if (!(file instanceof File)) throw new Error("文件不能为空");

    if (!isSupportedFile(file)) {
      throw new Error(
        "不支持的文件类型。" + getSupportedFormatsText(),
      );
    }

    const category = detectMediaCategory(file);
    const maxSize = getMaxFileSize(category);
    if (file.size > maxSize) {
      throw new Error(
        `文件大小超过限制 (${formatMaxSize(category)})`,
      );
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
  });

export const UpdateMediaNameInputSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
});

export const GetMediaListInputSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  unusedOnly: z.boolean().optional(),
  category: z.enum(["image", "guitar-pro", "video", "audio"]).optional(),
});

export type UpdateMediaNameInput = z.infer<typeof UpdateMediaNameInputSchema>;
export type GetMediaListInput = z.infer<typeof GetMediaListInputSchema>;
