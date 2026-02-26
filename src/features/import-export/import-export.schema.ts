import { z } from "zod";
import { POST_STATUSES } from "@/lib/db/schema";

// --- Export ---

export const StartExportInputSchema = z.object({
  postIds: z.array(z.number()).optional(),
  status: z.enum(POST_STATUSES).optional(),
});

export type StartExportInput = z.infer<typeof StartExportInputSchema>;

// --- Import ---

export const StartImportInputSchema = z.object({
  taskId: z.string(),
  r2Key: z.string(),
  mode: z.enum(["native", "markdown"]),
});

export type StartImportInput = z.infer<typeof StartImportInputSchema>;

// --- Progress ---

export const TaskProgressSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]),
  total: z.number(),
  completed: z.number(),
  current: z.string(),
  errors: z.array(z.object({ post: z.string(), reason: z.string() })),
  warnings: z.array(z.string()),
  downloadKey: z.string().optional(),
  report: z
    .object({
      succeeded: z.array(z.object({ title: z.string(), slug: z.string() })),
      failed: z.array(z.object({ title: z.string(), reason: z.string() })),
      warnings: z.array(z.string()),
    })
    .optional(),
});

export type TaskProgress = z.infer<typeof TaskProgressSchema>;
export type ImportReport = NonNullable<TaskProgress["report"]>;

export const GetProgressInputSchema = z.object({
  taskId: z.string(),
});

export type GetProgressInput = z.infer<typeof GetProgressInputSchema>;

// --- Manifest ---

export const EXPORT_MANIFEST_VERSION = "1.0";

export const ExportManifestSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  postCount: z.number(),
  generator: z.string(),
});

export type ExportManifest = z.infer<typeof ExportManifestSchema>;

// --- Frontmatter ---

export const PostFrontmatterSchema = z.object({
  title: z.string().default(""),
  slug: z.string().default(""),
  summary: z.string().optional().nullable(),
  status: z.enum(POST_STATUSES).default("published"),
  publishedAt: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  readTimeInMinutes: z.number().default(1),
  tags: z.array(z.string()).default([]),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;

// --- Cache Keys ---

export const IMPORT_EXPORT_CACHE_KEYS = {
  exportProgress: (taskId: string) => `export:progress:${taskId}` as const,
  importProgress: (taskId: string) => `import:progress:${taskId}` as const,
};

// --- R2 Keys ---

export const IMPORT_EXPORT_R2_KEYS = {
  exportZip: (taskId: string) => `exports/${taskId}.zip` as const,
  importZip: (taskId: string) => `imports/${taskId}.zip` as const,
};

// --- Import Post Entry ---

/** ZIP 中发现的单篇文章条目 */
export interface PostEntry {
  dir: string;
  title: string;
  prefix: string;
  mdPath?: string;
}
